import { useState, useEffect, useCallback } from 'react';
import { useOnlineStatus } from '../contexts/OnlineStatusContext';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';

// File name in Google Drive
const AI_SETTINGS_FILE_NAME = 'ai-settings.json';

export const useAISettings = () => {
  const isOnline = useOnlineStatus();
  const [aiSettings, setAiSettings] = useState({
    enabled: false,
    apiKey: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const getSettings = useQuery(api.ai.getSettings, 'skip');
  const saveSettings = useMutation(api.ai.saveSettings);

  // Load AI settings from Google Drive
  const loadAISettings = useCallback(async () => {
    try {
      if (getSettings) {
        setAiSettings(getSettings);
      }
      setError(null);
    } catch (err) {
      console.error('Error loading AI settings:', err);
      setError('Failed to load AI settings');
    } finally {
      setLoading(false);
    }
  }, [getSettings]);

  // Update session cache with latest AI settings
  const updateSessionCache = async () => {};

  // Save AI settings to Google Drive
  const saveAISettings = useCallback(async (newSettings) => {
    try {
      await saveSettings({ userId: newSettings.userId, enabled: newSettings.enabled, apiKey: newSettings.apiKey });
      setAiSettings({ enabled: !!newSettings.enabled, apiKey: newSettings.apiKey ? '••••••' : null });
      setError(null);
      return true;
    } catch (err) {
      console.error('Error saving AI settings:', err);
      setError('Failed to save AI settings');
      throw err;
    }
  }, [saveSettings]);

  // Toggle AI features
  const toggleAiFeatures = useCallback(async (enabled) => {
    const newSettings = { ...aiSettings, enabled };
    await saveAISettings(newSettings);
  }, [aiSettings, saveAISettings]);

  // Save API Key
  const saveApiKey = useCallback(async (apiKey) => {
    const newSettings = { ...aiSettings, apiKey };
    await saveAISettings(newSettings);
  }, [aiSettings, saveAISettings]);

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