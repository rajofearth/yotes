// src/contexts/GoogleDriveContext.jsx
import { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { supabase } from '../utils/supabaseClient';
import { useToast } from './ToastContext';
import { GoogleDriveAPI } from '../utils/googleDrive';
import { DriveStructureManager } from '../utils/driveStructure';
import { openDB, getFromDB, setInDB, clearDB } from '../utils/indexedDB';

const GoogleDriveContext = createContext(null);

export function GoogleDriveProvider({ children }) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [refreshTimer, setRefreshTimer] = useState(null);
  const [folderIds, setFolderIds] = useState(null);
  const showToast = useToast();

  const driveApi = useMemo(() => {
    return accessToken ? new GoogleDriveAPI(accessToken) : null;
  }, [accessToken]);

  const refreshToken = async () => {
    try {
      //console.log('Refreshing session...');
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) throw error;
      if (!session || !session.provider_token) {
        throw new Error('No valid session or missing provider_token');
      }
      setAccessToken(session.provider_token);
      await setInDB('sessions', 'session', session);
      scheduleTokenRefresh(session);
      //console.log('Session refreshed successfully');
    } catch (err) {
      console.error('Refresh failed:', err);
      showToast('Google Drive access expired. Sign in again to reconnect.', 'error');
      setAccessToken(null);
      setFolderIds(null);
      // Do not clearDB or redirect here; let App.jsx handle sign-out
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
      //console.log('Starting Google Drive initialization...');
      const cachedSession = await getFromDB('sessions', 'session');
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) throw error;

      if (!session) {
        console.log('No session found');
        setIsLoading(false);
        return;
      }

      if (!session.provider_token) {
        console.log('No provider_token found; Drive features disabled');
        setIsLoading(false);
        await supabase.auth.signOut();
        await clearDB();
        return;
      }

      setAccessToken(session.provider_token);
      await setInDB('sessions', 'session', session);
      scheduleTokenRefresh(session);

      //console.log('Initializing Drive structure...');
      const structureManager = new DriveStructureManager(new GoogleDriveAPI(session.provider_token));
      const folders = await structureManager.initializeStructure();
      setFolderIds(folders);
      //console.log('Drive initialized, setting isLoading to false');
      setIsLoading(false);
    } catch (err) {
      console.error('Initialization error:', err);
      setError(err);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    initializeGoogleDrive();
  }, []);

  const value = {
    isLoading,
    error,
    driveApi,
    folderIds,
    refreshToken,
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