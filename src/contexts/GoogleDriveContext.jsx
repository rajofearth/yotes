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
      console.log('Refreshing session...');
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) throw error;
      if (!session || !session.provider_token) {
        throw new Error('No valid session or missing provider_token');
      }
      setAccessToken(session.provider_token);
      scheduleTokenRefresh(session);
      console.log('Session refreshed successfully');
    } catch (err) {
      console.error('Refresh failed:', err);
      showToast('Session expired. Please sign in again.', 'error');
      setIsSignedOut(true);
      localStorage.clear();
      navigate('/login');
    }
  };

  const scheduleTokenRefresh = (session) => {
    if (refreshTimer) clearTimeout(refreshTimer);
    const REFRESH_MARGIN = 5 * 60 * 1000;
    const expiresIn = (session.expires_in ? session.expires_in * 1000 : 55 * 60 * 1000);
    const refreshTime = expiresIn - REFRESH_MARGIN;
    //console.log(`Scheduling token refresh in ${refreshTime / 1000 / 60} minutes`);
    const timer = setTimeout(refreshToken, refreshTime);
    setRefreshTimer(timer);
  };

  useEffect(() => {
    async function initializeGoogleDrive() {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        //console.log('Initial session:', session);
        if (!session || !session.provider_token) {
          console.log('No active session or missing provider_token');
          setIsSignedOut(true);
          navigate('/login', { replace: true });
          setIsLoading(false);
          return;
        }

        setAccessToken(session.provider_token);
        scheduleTokenRefresh(session);
        const structureManager = new DriveStructureManager(new GoogleDriveAPI(session.provider_token));
        const folders = await structureManager.initializeStructure();
        setFolderIds(folders);
        setIsLoading(false);
      } catch (err) {
        console.error('Initialization error:', err);
        setError(err);
        navigate('/login', { replace: true });
        setIsLoading(false);
      }
    }
    initializeGoogleDrive();
  }, [navigate]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      //console.log('Auth state changed:', event, 'Session:', session);
      if (event === 'SIGNED_OUT') {
        setAccessToken(null);
        setFolderIds(null);
        setIsSignedOut(true);
        if (refreshTimer) clearTimeout(refreshTimer);
        navigate('/login', { replace: true });
      } else if (event === 'TOKEN_REFRESHED' && session?.provider_token) {
        setAccessToken(session.provider_token);
        scheduleTokenRefresh(session);
      } else if (event === 'SIGNED_IN' && session?.provider_token) {
        setAccessToken(session.provider_token);
        setIsSignedOut(false);
        scheduleTokenRefresh(session);
        setIsLoading(false);
      } else if (event === 'INITIAL_SESSION') {
        if (session && session.provider_token) {
          setAccessToken(session.provider_token);
          setIsSignedOut(false);
          scheduleTokenRefresh(session);
          setIsLoading(false);
        } else {
          console.log('No valid session detected');
          setIsSignedOut(true);
          navigate('/login', { replace: true });
        }
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
    isSignedOut,
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