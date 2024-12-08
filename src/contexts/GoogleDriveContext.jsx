import { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { supabase } from '../utils/supabaseClient';
import { useToast } from './ToastContext';
import { GoogleDriveAPI } from '../utils/googleDrive';
import { DriveStructureManager } from '../utils/driveStructure';

const GoogleDriveContext = createContext(null);

export function GoogleDriveProvider({ children }) {
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [accessToken, setAccessToken] = useState(null);
    const [refreshTimer, setRefreshTimer] = useState(null);
    const [folderIds, setFolderIds] = useState(null);
    const showToast = useToast();

    // Create a memoized driveApi instance
    const driveApi = useMemo(() => {
        return accessToken ? new GoogleDriveAPI(accessToken) : null;
    }, [accessToken]);

    // Initialize drive structure when driveApi is available
    useEffect(() => {
        async function initializeDriveStructure() {
            if (!driveApi) return;

            try {
                const structureManager = new DriveStructureManager(driveApi);
                const folders = await structureManager.initializeStructure();
                setFolderIds(folders);
            } catch (err) {
                console.error('Failed to initialize drive structure:', err);
                setError(err);
                showToast('Failed to initialize Google Drive structure', 'error');
            }
        }

        if (driveApi) {
            initializeDriveStructure();
        }
    }, [driveApi]);

    // Function to refresh the token
    const refreshToken = async () => {
        try {
            const { data: { session }, error: refreshError } = await supabase.auth.refreshSession();
            
            if (refreshError) throw refreshError;
            
            if (!session?.provider_token) {
                throw new Error('Failed to refresh Google access token');
            }

            setAccessToken(session.provider_token);
            scheduleTokenRefresh(session);
            
        } catch (err) {
            console.error('Token refresh failed:', err);
            setError(err);
            showToast('Failed to refresh Google Drive access. Please sign in again.', 'error');
        }
    };

    // Function to schedule token refresh
    const scheduleTokenRefresh = (session) => {
        if (refreshTimer) {
            clearTimeout(refreshTimer);
        }

        // Refresh 5 minutes before expiry or every 45 minutes, whichever is shorter
        const REFRESH_MARGIN = 5 * 60 * 1000; // 5 minutes
        const MAX_TOKEN_LIFETIME = 45 * 60 * 1000; // 45 minutes
        const expiresIn = session.expires_in * 1000;
        const refreshTime = Math.min(expiresIn - REFRESH_MARGIN, MAX_TOKEN_LIFETIME);

        const timer = setTimeout(refreshToken, refreshTime);
        setRefreshTimer(timer);
    };

    // Initial setup
    useEffect(() => {
        let mounted = true;

        async function initializeGoogleDrive() {
            try {
                const { data: { session }, error: sessionError } = await supabase.auth.getSession();
                
                if (sessionError) throw sessionError;
                
                if (!session?.provider_token) {
                    throw new Error('No Google access token found. Please sign in with Google.');
                }

                if (mounted) {
                    setAccessToken(session.provider_token);
                    scheduleTokenRefresh(session);
                }
            } catch (err) {
                console.error('Failed to initialize Google Drive:', err);
                if (mounted) {
                    setError(err);
                }
            } finally {
                if (mounted) {
                    setIsLoading(false);
                }
            }
        }

        initializeGoogleDrive();

        return () => {
            mounted = false;
            if (refreshTimer) {
                clearTimeout(refreshTimer);
            }
        };
    }, []);

    // Listen for auth state changes
    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_OUT') {
                setAccessToken(null);
                setFolderIds(null);
                if (refreshTimer) {
                    clearTimeout(refreshTimer);
                }
            } else if (event === 'TOKEN_REFRESHED' && session?.provider_token) {
                setAccessToken(session.provider_token);
                scheduleTokenRefresh(session);
            }
        });

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    const value = {
        isLoading: isLoading || !folderIds,
        error,
        driveApi,
        folderIds,
        refreshToken
    };

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