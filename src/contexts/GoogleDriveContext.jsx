import { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { supabase } from '../utils/supabaseClient';
import { useToast } from './ToastContext';
import { GoogleDriveAPI } from '../utils/googleDrive';
import { DriveStructureManager } from '../utils/driveStructure';
import { openDB, getFromDB, setInDB, clearDB } from '../utils/indexedDB';
import { useOnlineStatus } from './OnlineStatusContext';

const GoogleDriveContext = createContext(null);
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const CLIENT_SECRET = import.meta.env.VITE_GOOGLE_CLIENT_SECRET;

// Helper to find the Supabase auth token key in localStorage
const findSupabaseLocalStorageKey = () => {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        // V2 key format: sb-<project-ref>-auth-token
        // V1 key format might differ slightly, adjust if needed
        if (key && key.startsWith('sb-') && key.endsWith('-auth-token')) return key;
    }
    // console.warn('Supabase localStorage key not found.');
    return null;
};

export function GoogleDriveProvider({ session, children }) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [refreshTokenValue, setRefreshTokenValue] = useState(null);
  const [refreshTimer, setRefreshTimer] = useState(null);
  const [folderIds, setFolderIds] = useState(null);
  const showToast = useToast();
  const hasInitializedRef = useRef(false);
  const refreshTokenPromiseRef = useRef(null);
  const isOnline = useOnlineStatus();

  const driveApi = useMemo(() => {
    return accessToken ? new GoogleDriveAPI(accessToken) : null;
  }, [accessToken]);

  const scheduleTokenRefresh = useCallback((expiresIn) => {
    clearTimeout(refreshTimer);

    const REFRESH_MARGIN_MS = 5 * 60 * 1000;
    const MIN_REFRESH_INTERVAL_MS = 1 * 60 * 1000;
    let refreshTimeMs = (expiresIn * 1000) - REFRESH_MARGIN_MS;
    refreshTimeMs = Math.max(MIN_REFRESH_INTERVAL_MS, refreshTimeMs);

    if (refreshTimeMs <= 0) {
        refreshToken();
        return;
    }

    const timer = setTimeout(() => refreshToken(), refreshTimeMs);
    setRefreshTimer(timer);
  }, [/* Removed refreshToken dependency */]);

  const refreshToken = useCallback(async () => {
    if (refreshTokenPromiseRef.current) {
        return refreshTokenPromiseRef.current;
    }

    const refreshPromise = (async () => {
        let currentRefreshToken = refreshTokenValue;
        let cachedSession;

        try {
            if (!currentRefreshToken) {
                cachedSession = await getFromDB('sessions', 'session');
                currentRefreshToken = cachedSession?.provider_refresh_token;
                if (currentRefreshToken) {
                    setRefreshTokenValue(currentRefreshToken);
                }
            }

            if (!currentRefreshToken) {
                throw new Error('No refresh token available');
            }

            const tempDriveApi = new GoogleDriveAPI('temp-token-for-refresh');
            const { provider_token, expires_in } = await tempDriveApi.refreshProviderToken(
                currentRefreshToken,
                CLIENT_ID,
                CLIENT_SECRET
            );

            setAccessToken(provider_token);

            // --- Prepare updated session data ---
            if (!cachedSession) {
                cachedSession = await getFromDB('sessions', 'session') || {};
            }
            const newExpiresAt = Math.floor(Date.now() / 1000) + expires_in;
            const updatedSessionData = {
                ...cachedSession, // Include existing Supabase tokens, user info etc.
                provider_token,
                provider_refresh_token: currentRefreshToken, // Ensure refresh token is persisted
                expires_in,
                expires_at: newExpiresAt,
                user: cachedSession?.user,
            };

            // --- Update IndexedDB ---
            await setInDB('sessions', 'session', updatedSessionData);
            // console.log('Updated session in IndexedDB.');

            // --- Update localStorage ---
            const supabaseKey = findSupabaseLocalStorageKey();
            if (supabaseKey && typeof window !== 'undefined' && window.localStorage) {
                try {
                    let storedSession = {};
                    const storedSessionStr = localStorage.getItem(supabaseKey);
                    if (storedSessionStr) {
                        storedSession = JSON.parse(storedSessionStr);
                    }

                    // Merge updated provider data into the existing localStorage object
                    const mergedLocalStorageSession = {
                        ...storedSession, // Keep existing Supabase tokens, user, etc.
                        provider_token: updatedSessionData.provider_token,
                        provider_refresh_token: updatedSessionData.provider_refresh_token,
                        expires_at: updatedSessionData.expires_at,
                        expires_in: updatedSessionData.expires_in,
                    };

                    localStorage.setItem(supabaseKey, JSON.stringify(mergedLocalStorageSession));
                    // console.log('Updated Supabase session in localStorage.');

                    // Optionally, inform the Supabase client instance (might not be strictly needed if relying on page refresh)
                    // await supabase.auth.setSession(mergedLocalStorageSession); // Use with caution

                } catch (lsError) {
                    console.error('Failed to update Supabase session in localStorage:', lsError);
                }
            }
            // --- End localStorage Update ---

            scheduleTokenRefresh(expires_in);
            return provider_token;

        } catch (err) {
            console.error('Token refresh failed:', err);
            setAccessToken(null);
            setFolderIds(null);
            setError(err);
            clearTimeout(refreshTimer);

            if (err.message.includes('No refresh token available') || err.message.includes('invalid_grant')) {
                showToast(`Google Drive access error: ${err.message}. Please sign in again.`, 'error');
                await supabase.auth.signOut().catch(e => console.error("Sign out error during refresh failure", e));
                await clearDB().catch(e => console.error("Clear DB error during refresh failure", e));
                const supabaseKey = findSupabaseLocalStorageKey();
                if (supabaseKey && typeof window !== 'undefined') localStorage.removeItem(supabaseKey);
            } else {
                showToast(err.message || 'Failed to refresh Google Drive token.', 'error');
            }
            return null;
        } finally {
             refreshTokenPromiseRef.current = null;
        }
    })();

    refreshTokenPromiseRef.current = refreshPromise;
    return refreshPromise;

  }, [refreshTokenValue, showToast, scheduleTokenRefresh]);


  useEffect(() => {
    let isMounted = true;

    const initializeGoogleDrive = async () => {
        if (hasInitializedRef.current || !isMounted || !session) {
            if (!session) setIsLoading(false);
            return;
        }

        setIsLoading(true);
        setError(null);
        let tokenToUse = null;

        try {
            // Check if we're offline
            if (!isOnline) {
                console.log('Offline mode detected during Google Drive initialization');
                // Try to get cached folder IDs
                const cachedFolderIds = await getFromDB('sessions', 'folder_ids');
                if (cachedFolderIds) {
                    // Use cached folder structure
                    if (isMounted) {
                        setFolderIds(cachedFolderIds);
                        hasInitializedRef.current = true;
                    }
                } else {
                    if (isMounted) {
                        setError(new Error('Offline with no cached data. Connect to the internet to initialize.'));
                    }
                }
                return;
            }

            // Defensive: Try to get refresh token from session, then IndexedDB, then localStorage
            let currentRefreshToken = session?.provider_refresh_token;
            if (!currentRefreshToken) {
                // Try IndexedDB
                const dbSession = await getFromDB('sessions', 'session');
                if (dbSession?.provider_refresh_token) {
                    currentRefreshToken = dbSession.provider_refresh_token;
                    setRefreshTokenValue(currentRefreshToken);
                    // Sync to localStorage if needed
                    const supabaseKey = findSupabaseLocalStorageKey();
                    if (supabaseKey && window.localStorage) {
                        try {
                            const storedSessionStr = localStorage.getItem(supabaseKey);
                            let storedSession = storedSessionStr ? JSON.parse(storedSessionStr) : {};
                            if (storedSession.provider_refresh_token !== currentRefreshToken) {
                                storedSession.provider_refresh_token = currentRefreshToken;
                                localStorage.setItem(supabaseKey, JSON.stringify(storedSession));
                            }
                        } catch (e) { console.error("Error updating refresh token in LS during defensive init:", e); }
                    }
                }
            } else {
                setRefreshTokenValue(currentRefreshToken);
                // Also ensure it's in IndexedDB & LocalStorage if missing/different
                const dbSession = await getFromDB('sessions', 'session') || {};
                if (dbSession.provider_refresh_token !== currentRefreshToken) {
                    dbSession.provider_refresh_token = currentRefreshToken;
                    await setInDB('sessions', 'session', dbSession);
                }
                const supabaseKey = findSupabaseLocalStorageKey();
                if (supabaseKey && window.localStorage) {
                    try {
                        const storedSessionStr = localStorage.getItem(supabaseKey);
                        if (storedSessionStr) {
                            const storedSession = JSON.parse(storedSessionStr);
                            if(storedSession.provider_refresh_token !== currentRefreshToken) {
                                storedSession.provider_refresh_token = currentRefreshToken;
                                localStorage.setItem(supabaseKey, JSON.stringify(storedSession));
                            }
                        }
                    } catch (e) { console.error("Error updating refresh token in LS during init:", e); }
                }
            }
            if (!currentRefreshToken) {
                // If session exists but refresh token doesn't, it's an issue.
                console.warn("GoogleDriveProvider: Session exists but provider_refresh_token is missing.");
                setRefreshTokenValue(null);
                // Attempting refresh might fail, but let's try, it might use older stored token
            }

            const nowSeconds = Math.floor(Date.now() / 1000);
            const tokenExpiry = session.expires_at;
            const isValid = session.provider_token && tokenExpiry && tokenExpiry > nowSeconds + 60;

            if (isValid) {
                tokenToUse = session.provider_token;
                setAccessToken(tokenToUse);
                scheduleTokenRefresh(tokenExpiry - nowSeconds);
            } else {
                 tokenToUse = await refreshToken();
                 if (!tokenToUse) {
                      throw new Error("Token refresh failed during initialization.");
                 }
            }

            if (tokenToUse && isMounted) {
                const setupDriveApi = new GoogleDriveAPI(tokenToUse);
                const structureManager = new DriveStructureManager(setupDriveApi);
                try {
                    const folders = await structureManager.initializeStructure();
                    if (isMounted) {
                        setFolderIds(folders);
                        // Cache folder IDs for offline use
                        await setInDB('sessions', 'folder_ids', folders);
                        hasInitializedRef.current = true;
                    }
                } catch (folderError) {
                    console.error('Error initializing drive structure:', folderError);
                    // If offline, try to use cached folders
                    if (!navigator.onLine) {
                        const cachedFolderIds = await getFromDB('sessions', 'folder_ids');
                        if (cachedFolderIds && isMounted) {
                            console.log('Using cached folder IDs after structure init failure');
                            setFolderIds(cachedFolderIds);
                            hasInitializedRef.current = true;
                        } else {
                            throw new Error('Cannot initialize while offline with no cached data');
                        }
                    } else {
                        throw folderError;
                    }
                }
            } else if (isMounted && !error) {
                 setError(new Error('Failed to obtain access token.'));
            }

        } catch (err) {
             console.error('GoogleDriveProvider: Initialization Error:', err);
             if (isMounted && !error) setError(err);
             // Ensure state is reset on failure
             setAccessToken(null);
             // Don't reset folderIds if offline - we might be using cached values
             if (isOnline) setFolderIds(null);
        } finally {
             if (isMounted) setIsLoading(false);
        }
    };

    if (session) {
        initializeGoogleDrive();
    } else {
        // Reset state when session is null (logged out)
        setIsLoading(false);
        setAccessToken(null);
        setRefreshTokenValue(null);
        setFolderIds(null);
        setError(null);
        clearTimeout(refreshTimer);
        hasInitializedRef.current = false;
        refreshTokenPromiseRef.current = null;
    }

    return () => {
        isMounted = false;
        clearTimeout(refreshTimer);
    };
  }, [session, refreshToken, scheduleTokenRefresh, error, isOnline]); // Added isOnline to dep array

  useEffect(() => {
    // Check if we're offline and still in loading state
    if (!isOnline && isLoading) {
      console.log('GoogleDriveProvider: Detected offline status during loading, finishing initialization');
      setIsLoading(false);
      if (!folderIds) {
        // Try to get cached folder IDs
        getFromDB('sessions', 'folder_ids')
          .then(cachedIds => {
            if (cachedIds) {
              setFolderIds(cachedIds);
              hasInitializedRef.current = true;
            }
          })
          .catch(err => console.error('Error getting cached folder IDs:', err));
      }
    }
  }, [isOnline, isLoading, folderIds]);

  const value = useMemo(() => ({
    isLoading,
    error,
    driveApi,
    folderIds,
  }), [isLoading, error, driveApi, folderIds]);

  return (
    <GoogleDriveContext.Provider value={value}>
      {children}
    </GoogleDriveContext.Provider>
  );
}

export function useGoogleDrive() {
  const context = useContext(GoogleDriveContext);
  if (!context) {
    throw new Error('useGoogleDrive must be used within a GoogleDriveProvider');
  }
  return context;
}