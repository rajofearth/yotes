// src/contexts/GoogleDriveContext.jsx
import { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { supabase } from '../utils/supabaseClient';
import { useToast } from './ToastContext';
import { GoogleDriveAPI } from '../utils/googleDrive';
import { DriveStructureManager } from '../utils/driveStructure';
import { openDB, getFromDB, setInDB, clearDB } from '../utils/indexedDB';

const GoogleDriveContext = createContext(null);

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const CLIENT_SECRET = import.meta.env.VITE_GOOGLE_CLIENT_SECRET;

export function GoogleDriveProvider({ children }) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [refreshTokenValue, setRefreshTokenValue] = useState(null);
  const [refreshTimer, setRefreshTimer] = useState(null);
  const [folderIds, setFolderIds] = useState(null);
  const showToast = useToast();

  const driveApi = useMemo(() => {
    return accessToken ? new GoogleDriveAPI(accessToken) : null;
  }, [accessToken]);

  const refreshToken = async () => {
    try {
      const cachedSession = await getFromDB('sessions', 'session');
      const currentRefreshToken = refreshTokenValue || cachedSession?.provider_refresh_token;
      if (!currentRefreshToken) {
        throw new Error('No refresh token available');
      }

      const tempDriveApi = driveApi || new GoogleDriveAPI('temp-token');
      const { provider_token, expires_in } = await tempDriveApi.refreshProviderToken(
        currentRefreshToken,
        CLIENT_ID,
        CLIENT_SECRET
      );

      setAccessToken(provider_token);
      setRefreshTokenValue(currentRefreshToken);

      const updatedSession = {
        ...cachedSession,
        provider_token,
        expires_in,
        expires_at: Math.floor(Date.now() / 1000) + expires_in
      };
      await setInDB('sessions', 'session', updatedSession);
      scheduleTokenRefresh(expires_in);
    } catch (err) {
      console.error('Refresh failed:', err);
      showToast('Google Drive access expired. Please sign in again.', 'error');
      setAccessToken(null);
      setFolderIds(null);
      await supabase.auth.signOut();
      await clearDB();
    }
  };

  const scheduleTokenRefresh = (expiresIn) => {
    if (refreshTimer) clearTimeout(refreshTimer);
    const REFRESH_MARGIN = 5 * 60 * 1000; // 5 minutes before expiry
    const refreshTime = (expiresIn * 1000) - REFRESH_MARGIN;
    const timer = setTimeout(refreshToken, refreshTime);
    setRefreshTimer(timer);
  };

  const initializeGoogleDrive = async () => {
    try {
      console.log('Starting Google Drive initialization...');
      const cachedSession = await getFromDB('sessions', 'session');
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) throw error;

      if (!session) {
        console.log('No session found');
        setIsLoading(false);
        return;
      }

      if (!session.provider_token || !session.provider_refresh_token) {
        console.log('Missing provider tokens; signing out');
        await supabase.auth.signOut();
        await clearDB();
        setIsLoading(false);
        return;
      }

      setAccessToken(session.provider_token);
      setRefreshTokenValue(session.provider_refresh_token);
      await setInDB('sessions', 'session', session);
      scheduleTokenRefresh(session.expires_in);

      const structureManager = new DriveStructureManager(new GoogleDriveAPI(session.provider_token));
      const folders = await structureManager.initializeStructure();
      setFolderIds(folders);
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