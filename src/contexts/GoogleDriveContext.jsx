// src/contexts/GoogleDriveContext.jsx
import { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { supabase } from '../utils/supabaseClient';
import { useToast } from './ToastContext';
import { GoogleDriveAPI } from '../utils/googleDrive';
import { DriveStructureManager } from '../utils/driveStructure';

const GoogleDriveContext = createContext(null);

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const CLIENT_SECRET = import.meta.env.VITE_GOOGLE_CLIENT_SECRET;

export function GoogleDriveProvider({ children }) {
  const [isDriveLoading, setIsDriveLoading] = useState(true);
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
      let { data: { session }, error } = await supabase.auth.getSession();
      if (error) throw error;

      if (!session?.provider_refresh_token) {
        console.log('No refresh token in session, attempting manual refresh...');
        const { error: refreshError } = await supabase.auth.refreshSession();
        if (refreshError) throw refreshError;
        const refreshed = await supabase.auth.getSession();
        session = refreshed.data.session;
        console.log('Refreshed session:', {
          provider_token: session?.provider_token,
          provider_refresh_token: session?.provider_refresh_token,
          expires_at: session?.expires_at
        });
        if (!session?.provider_refresh_token) {
          throw new Error('No refresh token available after refresh');
        }
      }

      console.log('Refreshing token with refresh_token:', session.provider_refresh_token);
      const tempDriveApi = driveApi || new GoogleDriveAPI('temp-token');
      const { provider_token, expires_in } = await tempDriveApi.refreshProviderToken(
        session.provider_refresh_token,
        CLIENT_ID,
        CLIENT_SECRET
      );

      console.log('Token refreshed successfully:', { provider_token, expires_in });
      setAccessToken(provider_token);
      setRefreshTokenValue(session.provider_refresh_token);
      scheduleTokenRefresh(expires_in);
      return provider_token;
    } catch (err) {
      console.error('Token refresh failed:', err);
      showToast('Session expired. Please sign in again.', 'error');
      setAccessToken(null);
      setFolderIds(null);
      await supabase.auth.signOut();
      throw err;
    }
  };

  const scheduleTokenRefresh = (expiresIn) => {
    if (refreshTimer) clearTimeout(refreshTimer);
    const REFRESH_MARGIN = 5 * 60 * 1000;
    const refreshTime = (expiresIn * 1000) - REFRESH_MARGIN;
    console.log('Scheduling token refresh in:', refreshTime / 1000, 'seconds');
    const timer = setTimeout(async () => {
      try {
        await refreshToken();
      } catch (err) {
        // Error handled in refreshToken
      }
    }, refreshTime);
    setRefreshTimer(timer);
  };

  const initializeGoogleDrive = async () => {
    setIsDriveLoading(true);
    try {
      console.log('Starting Google Drive initialization...');
      let { data: { session }, error } = await supabase.auth.getSession();
      if (error) throw error;

      if (!session) {
        console.log('No session found');
        setIsDriveLoading(false);
        return;
      }

      console.log('Current session:', {
        provider_token: session.provider_token,
        provider_refresh_token: session.provider_refresh_token,
        expires_at: session.expires_at,
        access_token: session.access_token,
        refresh_token: session.refresh_token
      });

      if (!session.provider_token || !session.provider_refresh_token) {
        console.log('No provider tokens, attempting refresh...');
        const { error: refreshError } = await supabase.auth.refreshSession();
        if (refreshError) throw refreshError;
        const refreshed = await supabase.auth.getSession();
        session = refreshed.data.session;
        console.log('Refreshed session:', {
          provider_token: session.provider_token,
          provider_refresh_token: session.provider_refresh_token,
          expires_at: session.expires_at
        });
        if (!session.provider_token || !session.provider_refresh_token) {
          console.log('Missing provider tokens after refresh; signing out');
          await supabase.auth.signOut();
          setIsDriveLoading(false);
          return;
        }
      }

      setAccessToken(session.provider_token);
      setRefreshTokenValue(session.provider_refresh_token);
      scheduleTokenRefresh(session.expires_in);

      const structureManager = new DriveStructureManager(new GoogleDriveAPI(session.provider_token));
      const folders = await structureManager.initializeStructure();
      setFolderIds(folders);
      console.log('Google Drive initialized successfully');
    } catch (err) {
      console.error('Initialization error:', err);
      setError(err);
      showToast('Google Drive access expired. Please sign in again.', 'error');
      await supabase.auth.signOut();
    } finally {
      setIsDriveLoading(false);
    }
  };

  useEffect(() => {
    initializeGoogleDrive();
    return () => {
      if (refreshTimer) clearTimeout(refreshTimer);
    };
  }, []);

  const validateAndRefreshToken = async () => {
    if (!accessToken || !driveApi) {
      console.log('No access token or driveApi, refreshing...');
      return await refreshToken();
    }

    try {
      await driveApi.listFiles('root', 1);
      console.log('Token validated successfully');
      return accessToken;
    } catch (err) {
      if (err.message.includes('401')) {
        console.log('Token invalid, refreshing...');
        return await refreshToken();
      }
      throw err;
    }
  };

  const value = {
    isLoading: isDriveLoading,
    error,
    driveApi,
    folderIds,
    refreshToken: validateAndRefreshToken,
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