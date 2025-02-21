import { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { supabase } from '../utils/supabaseClient';
import { useToast } from './ToastContext';
import { GoogleDriveAPI } from '../utils/googleDrive';
import { DriveStructureManager } from '../utils/driveStructure';
import { useNavigate } from 'react-router-dom';

const GoogleDriveContext = createContext(null);

export function GoogleDriveProvider({ children }) {
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [accessToken, setAccessToken] = useState(null);
    const [refreshTimer, setRefreshTimer] = useState(null);
    const [folderIds, setFolderIds] = useState(null);
    const showToast = useToast();
    const navigate = useNavigate();

    // Create a memoized driveApi instance
    const driveApi = useMemo(() => {
        return accessToken ? new GoogleDriveAPI(accessToken) : null;
    }, [accessToken]);

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
            localStorage.removeItem('notes_cache');
            localStorage.removeItem('notes_cache_timestamp');
            await supabase.auth.signOut();
            navigate('/login');
        }
    };

    // Function to schedule token refresh
    const scheduleTokenRefresh = (session) => {
        if (refreshTimer) {
            clearTimeout(refreshTimer);
        }
        const REFRESH_MARGIN = 5 * 60 * 1000; // 5 minutes
        const MAX_TOKEN_LIFETIME = 45 * 60 * 1000; // 45 minutes
        const expiresIn = session.expires_in * 1000;
        const refreshTime = Math.min(expiresIn - REFRESH_MARGIN, MAX_TOKEN_LIFETIME);
        const timer = setTimeout(refreshToken, refreshTime);
        setRefreshTimer(timer);
    };

    // Initial setup and drive structure initialization
    useEffect(() => {
        async function initializeGoogleDrive() {
            try {
                const { data: { session }, error: sessionError } = await supabase.auth.getSession();
                if (sessionError) {
                    console.error('Session error:', sessionError);
                    setError(sessionError);
                    setIsLoading(false);
                    return;
                }
                // If no session exists (e.g., on login page), exit quietly
                if (!session) {
                    setIsLoading(false);
                    return;
                }
                // If session exists but no provider_token, that’s an error
                if (!session.provider_token) {
                    throw new Error('No Google access token found. Please sign in with Google.');
                }
                setAccessToken(session.provider_token);
                scheduleTokenRefresh(session);
                // Initialize drive structure
                const structureManager = new DriveStructureManager(new GoogleDriveAPI(session.provider_token));
                const folders = await structureManager.initializeStructure();
                setFolderIds(folders);
            } catch (err) {
                console.error('Failed to initialize Google Drive:', err);
                setError(err);
                // Only show toast and sign out if there’s a session
                const { data: { session } } = await supabase.auth.getSession();
                if (session) {
                    showToast('Failed to initialize Google Drive: ' + err.message, 'error');
                    localStorage.removeItem('notes_cache');
                    localStorage.removeItem('notes_cache_timestamp');
                    await supabase.auth.signOut();
                    navigate('/login');
                }
            } finally {
                setIsLoading(false);
            }
        }
        initializeGoogleDrive();
    }, [navigate, showToast]);

    // Listen for auth state changes
    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (_event === 'SIGNED_OUT') {
                setAccessToken(null);
                setFolderIds(null);
                if (refreshTimer) {
                    clearTimeout(refreshTimer);
                }
            } else if (_event === 'TOKEN_REFRESHED' && session?.provider_token) {
                setAccessToken(session.provider_token);
                scheduleTokenRefresh(session);
            }
        });
        return () => {
            subscription.unsubscribe();
        };
    }, [refreshTimer]);

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