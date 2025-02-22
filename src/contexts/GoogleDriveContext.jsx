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
    const [isSignedOut, setIsSignedOut] = useState(false);
    const showToast = useToast();
    const navigate = useNavigate();

    const driveApi = useMemo(() => {
        return accessToken && !isSignedOut ? new GoogleDriveAPI(accessToken) : null;
    }, [accessToken, isSignedOut]);

    const refreshToken = async () => {
        if (isSignedOut) return; // Skip if signed out
        try {
            const { data: { session }, error: refreshError } = await supabase.auth.refreshSession();
            if (refreshError) throw refreshError;
            if (!session?.provider_token) {
                throw new Error('Failed to refresh Google access token');
            }
            setAccessToken(session.provider_token);
            scheduleTokenRefresh(session);
            console.log('Token refreshed successfully');
        } catch (err) {
            console.error('Token refresh failed:', err);
            setError(err);
            showToast('Failed to refresh Google Drive access. Please sign in again.', 'error');
            localStorage.removeItem('notes_cache');
            localStorage.removeItem('notes_cache_timestamp');
            await supabase.auth.signOut();
            setIsSignedOut(true);
            navigate('/login');
        }
    };

    const scheduleTokenRefresh = (session) => {
        if (refreshTimer) {
            clearTimeout(refreshTimer);
        }
        const REFRESH_MARGIN = 5 * 60 * 1000; // 5 minutes
        const MAX_TOKEN_LIFETIME = 1440 * 60 * 1000; // 45 minutes
        const expiresIn = session.expires_in * 1000;
        const refreshTime = Math.min(expiresIn - REFRESH_MARGIN, MAX_TOKEN_LIFETIME);
        const timer = setTimeout(refreshToken, refreshTime);
        setRefreshTimer(timer);
    };

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
                if (!session) {
                    console.log('No active session');
                    setIsLoading(false);
                    return;
                }
                if (!session.provider_token) {
                    console.error('No Google access token found');
                    setError(new Error('No Google access token found. Please sign in with Google.'));
                    setIsLoading(false);
                    return;
                }
                setAccessToken(session.provider_token);
                scheduleTokenRefresh(session);
                const structureManager = new DriveStructureManager(new GoogleDriveAPI(session.provider_token));
                const folders = await structureManager.initializeStructure();
                setFolderIds(folders);
               // console.log('Google Drive initialized - Folder IDs:', folders);
            } catch (err) {
                //console.error('Failed to initialize Google Drive:', err);
                setError(err);
                if (err.message.includes('structure')) {
                    showToast('Failed to initialize Google Drive structure: ' + err.message, 'error');
                    localStorage.removeItem('notes_cache');
                    localStorage.removeItem('notes_cache_timestamp');
                    await supabase.auth.signOut();
                    setIsSignedOut(true);
                    navigate('/login');
                }
            } finally {
                setIsLoading(false);
            }
        }
        initializeGoogleDrive();
    }, [navigate, showToast]);

    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            //console.log('Auth state changed:', _event);
            if (_event === 'SIGNED_OUT') {
                setAccessToken(null);
                setFolderIds(null);
                setIsSignedOut(true);
                if (refreshTimer) {
                    clearTimeout(refreshTimer);
                }
            } else if (_event === 'TOKEN_REFRESHED' && session?.provider_token) {
                setAccessToken(session.provider_token);
                scheduleTokenRefresh(session);
            } else if (_event === 'SIGNED_IN' && session?.provider_token) {
                setAccessToken(session.provider_token);
                setIsSignedOut(false);
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
        refreshToken,
        isSignedOut
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