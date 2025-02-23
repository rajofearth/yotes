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
        if (isSignedOut) return;
        try {
            console.log('Refreshing session and Google provider token...');
            // First, ensure Supabase session is valid
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();
            if (sessionError || !session) {
                console.log('No valid session, attempting refresh...');
                const { error: refreshError } = await supabase.auth.refreshSession();
                if (refreshError) throw refreshError;

                // Re-fetch session after refresh
                const { data: { session: refreshedSession }, error: newError } = await supabase.auth.getSession();
                if (newError || !refreshedSession) throw new Error('Failed to refresh Supabase session');
                session = refreshedSession;
            }

            if (!session.provider_token) {
                console.log('Google provider token missing, attempting re-auth...');
                throw new Error('Google access token unavailable');
            }

            setAccessToken(session.provider_token);
            scheduleTokenRefresh(session);
            console.log('Session and token refreshed successfully');
        } catch (err) {
            console.error('Refresh failed:', err);
            setError(err);
            showToast('Google Drive access issue detected. Attempting to reconnect...', 'warning');
            await attemptSilentReauth();
        }
    };

    const attemptSilentReauth = async () => {
        try {
            console.log('Attempting silent Google re-authentication...');
            const { data, error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: `${window.location.origin}/auth/callback`,
                    scopes: 'https://www.googleapis.com/auth/drive.file',
                    queryParams: {
                        access_type: 'offline',
                        prompt: 'none', // Silent refresh attempt
                        include_granted_scopes: 'true'
                    }
                }
            });
            if (error) throw error;
            if (data?.session?.provider_token) {
                setAccessToken(data.session.provider_token);
                scheduleTokenRefresh(data.session);
                setError(null);
                showToast('Google Drive reconnected successfully', 'success');
            }
        } catch (err) {
            console.error('Silent re-auth failed:', err);
            showToast('Please sign in again to restore Google Drive access.', 'error');
            setIsSignedOut(true);
            navigate('/login');
        }
    };

    const scheduleTokenRefresh = (session) => {
        if (refreshTimer) clearTimeout(refreshTimer);

        const REFRESH_MARGIN = 5 * 60 * 1000; // 5 minutes
        // Use expires_in from session, fallback to 55 minutes for Google tokens
        const expiresIn = (session.expires_in ? session.expires_in * 1000 : 55 * 60 * 1000);
        const refreshTime = expiresIn - REFRESH_MARGIN;
        console.log(`Scheduling token refresh in ${refreshTime / 1000 / 60} minutes`);
        const timer = setTimeout(refreshToken, refreshTime);
        setRefreshTimer(timer);
    };

    useEffect(() => {
        async function initializeGoogleDrive() {
            try {
                const { data: { session }, error: sessionError } = await supabase.auth.getSession();
                if (sessionError) throw sessionError;
                if (!session) {
                    console.log('No active session');
                    setIsSignedOut(true);
                    navigate('/login');
                    setIsLoading(false);
                    return;
                }
                if (!session.provider_token) {
                    console.error('No Google access token found');
                    setError(new Error('No Google access token found'));
                    await attemptSilentReauth();
                    return;
                }
                setAccessToken(session.provider_token);
                scheduleTokenRefresh(session);
                const structureManager = new DriveStructureManager(new GoogleDriveAPI(session.provider_token));
                const folders = await structureManager.initializeStructure();
                setFolderIds(folders);
            } catch (err) {
                console.error('Initialization error:', err);
                setError(err);
                showToast('Failed to initialize Google Drive: ' + err.message, 'error');
                navigate('/login');
            } finally {
                setIsLoading(false);
            }
        }
        initializeGoogleDrive();
    }, [navigate, showToast]);

    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            console.log('Auth state changed:', _event);
            if (_event === 'SIGNED_OUT') {
                setAccessToken(null);
                setFolderIds(null);
                setIsSignedOut(true);
                if (refreshTimer) clearTimeout(refreshTimer);
                navigate('/login');
            } else if (_event === 'TOKEN_REFRESHED' && session?.provider_token) {
                setAccessToken(session.provider_token);
                scheduleTokenRefresh(session);
            } else if (_event === 'SIGNED_IN' && session?.provider_token) {
                setAccessToken(session.provider_token);
                setIsSignedOut(false);
                scheduleTokenRefresh(session);
                setIsLoading(false);
            }
        });
        return () => subscription.unsubscribe();
    }, [refreshTimer, navigate]);

    const value = {
        isLoading,
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