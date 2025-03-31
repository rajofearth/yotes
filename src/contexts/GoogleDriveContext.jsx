import { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { supabase } from '../utils/supabaseClient';
import { useToast } from './ToastContext';
import { GoogleDriveAPI } from '../utils/googleDrive';
import { DriveStructureManager } from '../utils/driveStructure';
import { openDB, getFromDB, setInDB, clearDB } from '../utils/indexedDB';

const GoogleDriveContext = createContext(null);
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const CLIENT_SECRET = import.meta.env.VITE_GOOGLE_CLIENT_SECRET;

// Helper to find the Supabase auth token key in localStorage
const findSupabaseLocalStorageKey = () => {
    if (typeof window === 'undefined' || !window.localStorage) {
        return null;
    }
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        // V2 key format: sb-<project-ref>-auth-token
        if (key && key.startsWith('sb-') && key.endsWith('-auth-token')) {
            return key;
        }
    }
    console.warn('Supabase localStorage key not found.');
    return null;
};

export function GoogleDriveProvider({ children }) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [refreshTokenValue, setRefreshTokenValue] = useState(null);
  const [refreshTimer, setRefreshTimer] = useState(null);
  const [folderIds, setFolderIds] = useState(null);
  const showToast = useToast();
  const didForceRefreshOnMount = useRef(false);

  const driveApi = useMemo(() => {
    return accessToken ? new GoogleDriveAPI(accessToken) : null;
  }, [accessToken]);

  const scheduleTokenRefresh = useCallback((expiresIn) => {
    setRefreshTimer(prevTimer => {
      if (prevTimer) clearTimeout(prevTimer);
      return null;
    });

    const REFRESH_MARGIN = 5 * 60 * 1000;
    const MIN_REFRESH_INTERVAL = 1 * 60 * 1000;
    const refreshTime = Math.max(MIN_REFRESH_INTERVAL, (expiresIn * 1000) - REFRESH_MARGIN);

    console.log(`Scheduling next token refresh in ${refreshTime / 1000 / 60} minutes.`);
    const timer = setTimeout(() => refreshToken(), refreshTime);
    setRefreshTimer(timer);
  }, []); // Removed dependency on refreshToken assuming stable identity via useCallback

  const refreshToken = useCallback(async () => {
    console.log('Attempting token refresh...');
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

      const tempDriveApi = new GoogleDriveAPI('temp-token');
      const { provider_token, expires_in } = await tempDriveApi.refreshProviderToken(
        currentRefreshToken,
        CLIENT_ID,
        CLIENT_SECRET
      );

      console.log('Token refreshed successfully via Google.');
      setAccessToken(provider_token);

      // --- Update Local Storage and IndexedDB ---
      if (!cachedSession) {
        cachedSession = await getFromDB('sessions', 'session') || {};
      }
      const newExpiresAt = Math.floor(Date.now() / 1000) + expires_in;
      const updatedSessionData = {
        ...cachedSession,
        provider_token,
        provider_refresh_token: currentRefreshToken,
        expires_in,
        expires_at: newExpiresAt,
        user: cachedSession?.user, // Preserve user data
      };

      // Update IndexedDB first
      await setInDB('sessions', 'session', updatedSessionData);
      console.log('Updated session in IndexedDB.');

      // Attempt to update localStorage
      const supabaseKey = findSupabaseLocalStorageKey();
      if (supabaseKey && typeof window !== 'undefined' && window.localStorage) {
        try {
          const storedSessionStr = localStorage.getItem(supabaseKey);
          if (storedSessionStr) {
            const storedSession = JSON.parse(storedSessionStr);
            // Update the relevant fields in the object Supabase stores
            storedSession.provider_token = provider_token;
            storedSession.provider_refresh_token = currentRefreshToken;
            storedSession.expires_at = newExpiresAt;
            storedSession.expires_in = expires_in;
            // Supabase's own access_token/refresh_token should ideally be managed by Supabase itself
            localStorage.setItem(supabaseKey, JSON.stringify(storedSession));
            console.log('Updated Supabase session in localStorage.');
          }
        } catch (lsError) {
          console.error('Failed to update Supabase session in localStorage:', lsError);
        }
      }
      // --- End Update ---

      scheduleTokenRefresh(expires_in);
      return provider_token;

    } catch (err) {
      console.error('Token refresh failed:', err);
      setAccessToken(null);
      setFolderIds(null);
      setError(err);

      if (err.message.includes('No refresh token available') || err.message.includes('invalid_grant')) {
        showToast(`Google Drive access error: ${err.message}. Please sign in again.`, 'error');
        await supabase.auth.signOut().catch(e => console.error("Sign out error", e));
        await clearDB().catch(e => console.error("Clear DB error", e));
        if (typeof window !== 'undefined' && window.localStorage) {
            const supabaseKey = findSupabaseLocalStorageKey();
            if (supabaseKey) localStorage.removeItem(supabaseKey);
        }
      } else {
        showToast('Failed to refresh Google Drive token. Some features may be unavailable.', 'error');
      }
      return null;
    }
  }, [refreshTokenValue, showToast, scheduleTokenRefresh]);


  useEffect(() => {
    let isMounted = true;
    const initializeGoogleDrive = async () => {
      if (!isMounted) return;
      console.log('Starting Google Drive initialization...');
      setIsLoading(true);
      setError(null);

      try {
        let session = await getFromDB('sessions', 'session');
        if (!session) {
          const { data: supabaseData, error: sessionError } = await supabase.auth.getSession();
          if (sessionError) throw sessionError;
          session = supabaseData.session;
        }

        if (!session) {
          console.log('No active session found.');
          if (isMounted) setIsLoading(false);
          return;
        }

        const currentRefreshToken = session.provider_refresh_token;
        if (!currentRefreshToken) {
          console.error('Session found, but missing Google provider_refresh_token!');
          showToast('Google connection incomplete. Please sign in again.', 'error');
          if (isMounted) { setAccessToken(null); setIsLoading(false); }
          return;
        }

        if(isMounted) setRefreshTokenValue(currentRefreshToken);
        await setInDB('sessions', 'session', session);

        let tokenToUseForSetup = null;

        if (!didForceRefreshOnMount.current) {
            console.log('Attempting forced token refresh on load...');
            didForceRefreshOnMount.current = true;
            tokenToUseForSetup = await refreshToken();
        } else {
            console.log('Skipping forced token refresh (Strict Mode run 2)...');
            const updatedSession = await getFromDB('sessions', 'session');
            tokenToUseForSetup = updatedSession?.provider_token;
            if (tokenToUseForSetup && isMounted && accessToken !== tokenToUseForSetup) {
                setAccessToken(tokenToUseForSetup);
            }
        }

        if (tokenToUseForSetup && isMounted) {
          console.log('Access token available, initializing Drive structure...');
          const setupDriveApi = new GoogleDriveAPI(tokenToUseForSetup);
          const structureManager = new DriveStructureManager(setupDriveApi);
          const folders = await structureManager.initializeStructure();
          if (isMounted) setFolderIds(folders);
          console.log('Drive structure initialized.');

          // Ensure scheduled refresh timer is active if needed (esp. after skipping forced refresh)
          if (!refreshTimer) {
             const sessionData = await getFromDB('sessions', 'session');
             if (sessionData?.expires_at && (sessionData.expires_at * 1000 > Date.now())) {
                const expiresInSeconds = sessionData.expires_at - Math.floor(Date.now() / 1000);
                if(expiresInSeconds > 60) {
                   scheduleTokenRefresh(expiresInSeconds);
                }
             }
          }
        } else if (isMounted) {
          console.error('Failed to obtain/confirm a valid access token during initialization.');
           if(!error) setError(new Error('Failed to obtain access token during initialization.'));
        }

      } catch (err) {
        console.error('Google Drive Initialization Error:', err);
         if (isMounted) { setError(err); setAccessToken(null); setFolderIds(null); }
      } finally {
        console.log('Google Drive initialization finished.');
        if (isMounted) setIsLoading(false);
      }
    };

    initializeGoogleDrive();

    return () => {
      isMounted = false;
      if (refreshTimer) clearTimeout(refreshTimer);
      didForceRefreshOnMount.current = false; // Reset ref on actual unmount
    };
  }, [refreshToken, scheduleTokenRefresh]); // Dependencies ensure effect reruns if these stable functions change identity


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