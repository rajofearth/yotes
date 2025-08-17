import { useState, useEffect, useCallback } from 'react';
import { useOnlineStatus } from '../contexts/OnlineStatusContext';
import { useMutation, useQuery } from 'convex/react';
import { encryptString } from '../lib/e2ee';
import { useNotes } from '../contexts/NotesContext';
import { api } from '../../convex/_generated/api';

export const useAISettings = () => {
  const isOnline = useOnlineStatus();
  // Get Convex userId for AI settings operations
  const { convexUserId } = useNotes();
  const [aiSettings, setAiSettings] = useState({
    enabled: false,
    apiKey: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const getSettings = useQuery(api.ai.getSettings, convexUserId ? { userId: convexUserId } : 'skip');
  const saveSettings = useMutation(api.ai.saveSettings);

  const loadAISettings = useCallback(async () => {
    try {
      if (getSettings) {
        setAiSettings(getSettings);
      }
      setError(null);
    } catch (err) {
      setError('Failed to load AI settings');
    } finally {
      setLoading(false);
    }
  }, [getSettings]);

  const updateSessionCache = async () => {};

  const saveAISettings = useCallback(async (newSettings) => {
    if (!convexUserId) {
      throw new Error('User not authenticated for AI settings');
    }
    try {
      const dek = window.__yotesDek;
      if (!dek) throw new Error('Encryption key not available');
      const mutationArgs = { userId: convexUserId, enabled: newSettings.enabled };
      if (newSettings.apiKey !== undefined) {
        // Encrypt API key
        const apiKeyEnc = await encryptString(dek, newSettings.apiKey);
        mutationArgs.apiKeyEnc = apiKeyEnc;
      }
      await saveSettings(mutationArgs);
      setAiSettings({ enabled: !!newSettings.enabled, apiKey: newSettings.apiKey ? '••••••' : aiSettings.apiKey });
      setError(null);
      return true;
    } catch (err) {
      setError('Failed to save AI settings');
      throw err;
    }
  }, [saveSettings, convexUserId, aiSettings.apiKey]);

  // Toggle AI features
  const toggleAiFeatures = useCallback(async (enabled) => {
    const newSettings = { ...aiSettings, enabled };
    return saveAISettings(newSettings);
  }, [aiSettings, saveAISettings]);

  // Save API Key
  const saveApiKey = useCallback(async (apiKey) => {
    const newSettings = { ...aiSettings, apiKey };
    return saveAISettings(newSettings);
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