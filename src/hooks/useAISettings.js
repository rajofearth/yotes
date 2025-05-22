import { useState, useEffect, useCallback } from 'react';
import { useGoogleDrive } from '../contexts/GoogleDriveContext';
import { useOnlineStatus } from '../contexts/OnlineStatusContext';
import { getFromDB, setInDB } from '../utils/indexedDB';

// File name in Google Drive
const AI_SETTINGS_FILE_NAME = 'ai-settings.json';

export const useAISettings = () => {
  const { driveApi, folderIds } = useGoogleDrive();
  const isOnline = useOnlineStatus();
  const [aiSettings, setAiSettings] = useState({
    enabled: false,
    apiKey: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load AI settings from Google Drive
  const loadAISettings = useCallback(async () => {
    if (!isOnline || !driveApi) {
      // Try to load from cached session when offline
      try {
        const session = await getFromDB('sessions', 'session');
        if (session?.aiSettings) {
          setAiSettings(session.aiSettings);
        }
      } catch (err) {
        console.error('Failed to load AI settings from cache:', err);
      }
      
      setLoading(false);
      return;
    }

    if (!folderIds?.root) {
      // Wait for the app folder to be initialized before loading settings
      return;
    }

    setLoading(true);
    try {
      // Search for the settings file in Google Drive
      const listResponse = await driveApi.listFiles(folderIds.root, `name='${AI_SETTINGS_FILE_NAME}'`);
      const files = listResponse.files;
      
      if (files && files.length > 0) {
        // File exists, get its content
        const fileId = files[0].id;
        const blobs = await driveApi.downloadFiles([fileId]);
        const text = await blobs[0].text();
        const settingsData = JSON.parse(text);
        setAiSettings(settingsData);
        
        // Save to session cache
        await updateSessionCache(settingsData);
      } else {
        // File doesn't exist yet, use default settings
        const defaultSettings = {
          enabled: false,
          apiKey: null,
        };
        setAiSettings(defaultSettings);
        
        // Save default settings to session cache
        await updateSessionCache(defaultSettings);
      }
      
      setError(null);
    } catch (err) {
      console.error('Error loading AI settings:', err);
      setError('Failed to load AI settings');
    } finally {
      setLoading(false);
    }
  }, [isOnline, driveApi, folderIds]);

  // Update session cache with latest AI settings
  const updateSessionCache = async (settings) => {
    try {
      const session = await getFromDB('sessions', 'session');
      if (session) {
        await setInDB('sessions', 'session', {
          ...session,
          aiSettings: settings
        });
      }
    } catch (err) {
      console.error('Failed to update session cache with AI settings:', err);
    }
  };

  // Save AI settings to Google Drive
  const saveAISettings = useCallback(async (newSettings) => {
    if (!isOnline || !driveApi || !folderIds?.root) {
      throw new Error('You must be online and Google Drive must be initialized to save AI settings');
    }

    try {
      // Create a file/blob for upload
      const settingsContent = JSON.stringify(newSettings);
      const file = new File([settingsContent], AI_SETTINGS_FILE_NAME, { type: 'application/json' });
      
      // For simplicity, always upload a new file (could be optimized to update existing)
      await driveApi.uploadFile(file, folderIds.root);
      
      // Update local state
      setAiSettings(newSettings);
      setError(null);
      
      // Update session cache
      await updateSessionCache(newSettings);
      
      return true;
    } catch (err) {
      console.error('Error saving AI settings:', err);
      setError('Failed to save AI settings');
      throw err;
    }
  }, [isOnline, driveApi, folderIds]);

  // Toggle AI features
  const toggleAiFeatures = useCallback(async (enabled) => {
    if (!isOnline) {
      throw new Error('You must be online to change AI settings');
    }
    
    const newSettings = {
      ...aiSettings,
      enabled,
    };
    
    await saveAISettings(newSettings);
  }, [isOnline, aiSettings, saveAISettings]);

  // Save API Key
  const saveApiKey = useCallback(async (apiKey) => {
    if (!isOnline) {
      throw new Error('You must be online to save API key');
    }
    
    const newSettings = {
      ...aiSettings,
      apiKey,
    };
    
    await saveAISettings(newSettings);
  }, [isOnline, aiSettings, saveAISettings]);

  // Load settings on initial mount and when user changes
  useEffect(() => {
    loadAISettings();
  }, [loadAISettings]);

  return {
    aiSettings,
    loading,
    error,
    toggleAiFeatures,
    saveApiKey,
    refreshAISettings: loadAISettings,
  };
}; 