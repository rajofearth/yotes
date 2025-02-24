import { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { supabase } from '../utils/supabaseClient';
import { useToast } from './ToastContext';
import { GoogleDriveAPI } from '../utils/googleDrive';
import { DriveStructureManager } from '../utils/driveStructure';
import { useNavigate } from 'react-router-dom';
import { openDB, getFromDB, setInDB, clearDB } from '../utils/indexedDB';

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
      await setInDB('sessions', 'session', session);
      scheduleTokenRefresh(session);
      console.log('Session refreshed successfully');
    } catch (err) {
      console.error('Refresh failed:', err);
      showToast('Session expired. Please sign in again.', 'error');
      setIsSignedOut(true);
      await clearDB();
      navigate('/login');
    }
  };

  const scheduleTokenRefresh = (session) => {
    if (refreshTimer) clearTimeout(refreshTimer);
    const REFRESH_MARGIN = 5 * 60 * 1000;
    const expiresIn = session.expires_in ? session.expires_in * 1000 : 55 * 60 * 1000;
    const refreshTime = expiresIn - REFRESH_MARGIN;
    const timer = setTimeout(refreshToken, refreshTime);
    setRefreshTimer(timer);
  };

  const initializeGoogleDrive = async () => {
    try {
      console.log('Starting Google Drive initialization...');
      const cachedSession = await getFromDB('sessions', 'session');
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) throw error;

      if (!session || !session.provider_token) {
        console.log('No session or provider_token, redirecting to login');
        setIsSignedOut(true);
        await clearDB();
        navigate('/login', { replace: true });
        setIsLoading(false);
        return;
      }

      setAccessToken(session.provider_token);
      await setInDB('sessions', 'session', session);
      scheduleTokenRefresh(session);

      console.log('Initializing Drive structure...');
      const structureManager = new DriveStructureManager(new GoogleDriveAPI(session.provider_token));
      const folders = await structureManager.initializeStructure();
      setFolderIds(folders);
      console.log('Drive initialized, setting isLoading to false');
      setIsLoading(false);
    } catch (err) {
      console.error('Initialization error:', err);
      setError(err);
      navigate('/login', { replace: true });
      setIsLoading(false);
    }
  };

  useEffect(() => {
    initializeGoogleDrive();
  }, [navigate, showToast]);

  // Move subscription outside useEffect to prevent re-subscription
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event);
      if (event === 'SIGNED_OUT') {
        setAccessToken(null);
        setFolderIds(null);
        setIsSignedOut(true);
        if (refreshTimer) clearTimeout(refreshTimer);
        await clearDB();
        navigate('/login', { replace: true });
      } else if (event === 'TOKEN_REFRESHED' && session?.provider_token) {
        setAccessToken(session.provider_token);
        await setInDB('sessions', 'session', session);
        scheduleTokenRefresh(session);
      } else if (event === 'SIGNED_IN' && session?.provider_token) {
        setAccessToken(session.provider_token);
        setIsSignedOut(false);
        await setInDB('sessions', 'session', session);
        scheduleTokenRefresh(session);
        setIsLoading(false);
      } else if (event === 'INITIAL_SESSION') {
        if (session && session.provider_token) {
          setAccessToken(session.provider_token);
          setIsSignedOut(false);
          await setInDB('sessions', 'session', session);
          scheduleTokenRefresh(session);
          setIsLoading(false);
        } else {
          setIsSignedOut(true);
          navigate('/login', { replace: true });
        }
      }
    });
    return () => subscription.unsubscribe();
  }, [navigate, showToast]); // Removed refreshTimer from deps

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