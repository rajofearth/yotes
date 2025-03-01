// src/hooks/useGoogleDrive.js
import { useState, useEffect, useCallback, useRef, useContext } from 'react';
import { useGoogleDrive } from '../contexts/GoogleDriveContext';
import { useToast } from '../contexts/ToastContext';
import {
  openDB,
  getFromDB,
  setInDB,
  addToSyncQueue,
  getSyncQueue,
  clearSyncItem,
} from '../utils/indexedDB';
import { supabase } from '../utils/supabaseClient'; // Import Supabase client
import { GoogleDriveAPI } from '../utils/googleDrive'; // Import GoogleDriveAPI

const CACHE_DURATION = 15 * 60 * 1000; // 15 minutes

export function useNotes() {
  const { driveApi, folderIds, isLoading: isDriveLoading } = useGoogleDrive();
  const [notes, setNotes] = useState([]);
  const [tags, setTags] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isInitialSync, setIsInitialSync] = useState(true);
  const [error, setError] = useState(null);
  const [loadingState, setLoadingState] = useState({ progress: 0, message: 'Initializing...' });
  const showToast = useToast();
  const hasLoadedFromDrive = useRef(false);

  const [googleDriveApi, setGoogleDriveApi] = useState(null); // State for GoogleDriveAPI
  const [isRefreshingToken, setIsRefreshingToken] = useState(false); // State to prevent concurrent refreshes

  const shouldRefreshCache = useCallback(async (storeName) => {
    try {
      const timestamp = await getFromDB(storeName, `${storeName}_timestamp`);
      return !timestamp || Date.now() - timestamp > CACHE_DURATION;
    } catch (err) {
      console.error(`Failed to check cache for ${storeName}:`, err);
      return true;
    }
  }, []);

  const refreshAccessToken = useCallback(async () => {
    if (isRefreshingToken) {
      console.log('Token refresh already in progress');
      return;
    }

    setIsRefreshingToken(true);
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) {
        console.error('Error getting session:', error);
        showToast(`Failed to refresh session: ${error.message}`, 'error');
        return;
      }

      const refreshToken = session?.refresh_token;

      if (!refreshToken) {
        console.warn('No refresh token available.');
        // Potentially force re-login here if refresh token is missing.
        return;
      }

      const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
      const clientSecret = import.meta.env.VITE_GOOGLE_CLIENT_SECRET;

      const googleDrive = new GoogleDriveAPI(''); // Create a new instance to use the refresh method
      const { provider_token, expires_in } = await googleDrive.refreshProviderToken(
        refreshToken,
        clientId,
        clientSecret
      );

      // Update Supabase session with the new access token.  This is CRITICAL.
      const { error: updateError } = await supabase.auth.updateSession({
        provider_token: provider_token,
        expires_in: expires_in
      });

      if (updateError) {
        console.error('Failed to update Supabase session:', updateError);
        showToast(`Failed to update session: ${updateError.message}`, 'error');
        return;
      }

      // Optimistically update local state
      setGoogleDriveApi(new GoogleDriveAPI(provider_token));
      showToast('Access token refreshed!', 'success');
      console.log('Access token refreshed successfully.');

    } catch (err) {
      console.error('Token refresh failed:', err);
      showToast(`Token refresh failed: ${err.message}`, 'error');
    } finally {
      setIsRefreshingToken(false);
    }
  }, [showToast]);

  useEffect(() => {
    const initializeGoogleDriveApi = async () => {
        setIsLoading(true); // Start loading
        try {
            const { data: { session }, error } = await supabase.auth.getSession();
            if (error) {
                console.error('Error getting session:', error);
                showToast(`Failed to get session: ${error.message}`, 'error');
                return;
            }

            if (session?.provider_token) {
                console.log("Session provider token: ", session.provider_token);
                setGoogleDriveApi(new GoogleDriveAPI(session.provider_token));
            } else {
                console.log("No provider token found in session.");
            }
        } catch (error) {
            console.error("Error initializing Google Drive API:", error);
            showToast(`Failed to initialize Google Drive API: ${error.message}`, 'error');
        } finally {
            setIsLoading(false); // End loading
        }
    };

    initializeGoogleDriveApi();
}, [showToast]);

  useEffect(() => {
    // Refresh token periodically (e.g., every 30 minutes)
    const refreshInterval = setInterval(refreshAccessToken, 30 * 60 * 1000);
    return () => clearInterval(refreshInterval);
  }, [refreshAccessToken]);
  const loadInitialData = useCallback(async () => {
    setLoadingState({ progress: 10, message: 'Checking local notes...' });
    //console.log('Loading initial data from IndexedDB...');
    try {
      const cachedNotes = (await getFromDB('notes', 'notes_data')) || [];
      const cachedTags = (await getFromDB('tags', 'tags_data')) || [];
      setNotes(cachedNotes);
      setTags(cachedTags);
      //console.log('Initial data loaded:', { notes: cachedNotes.length, tags: cachedTags.length });
      setLoadingState({ progress: 30, message: 'Local data loaded' });
      return { notes: cachedNotes, tags: cachedTags };
    } catch (err) {
      console.error('Failed to load initial data from IndexedDB:', err);
      setError(err);
      setLoadingState({ progress: 100, message: 'Error loading local data' });
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadData = useCallback(async (force = false) => {
    if (!googleDriveApi || !folderIds?.notes || !folderIds?.tags) {
      //console.log('Drive not ready, skipping loadData');
      setLoadingState({ progress: 40, message: 'Waiting for Google Drive...' });
      return;
    }

    setIsSyncing(true);
    setError(null);
    setLoadingState({ progress: 40, message: 'Connecting to Google Drive...' });
    //console.log('Starting loadData...', { force });

    try {
      const notesRefreshNeeded = force || await shouldRefreshCache('notes');
      const tagsRefreshNeeded = force || await shouldRefreshCache('tags');

      let tagsData = tags;
      if (tagsRefreshNeeded) {
        setLoadingState({ progress: 60, message: 'Loading tags...' });
        //console.log('Fetching tags from Google Drive...');
        const { files } = await googleDriveApi.listFiles(folderIds.tags);
        const tagsFile = files.find((f) => f.name === 'tags.json');
        if (tagsFile) {
          const [tagsBlob] = await googleDriveApi.downloadFiles([tagsFile.id]);
          tagsData = tagsBlob ? JSON.parse(await tagsBlob.text()) : [];
        } else {
          tagsData = [];
        }
        setTags(tagsData);
        await setInDB('tags', 'tags_data', tagsData);
        await setInDB('tags', 'tags_timestamp', Date.now());
        //console.log('Tags loaded and saved:', tagsData.length);
        setLoadingState({ progress: 80, message: 'Tags loaded' });
      }

      let notesData = notes;
      if (notesRefreshNeeded) {
        setLoadingState({ progress: 90, message: 'Loading notes...' });
        //console.log('Fetching notes from Google Drive...');
        const { files } = await googleDriveApi.listFiles(folderIds.notes);
        if (files.length) {
          const notesBlobs = await googleDriveApi.downloadFiles(files.map((f) => f.id));
          const validBlobs = notesBlobs.filter((blob) => blob);
          notesData = (await Promise.all(
            validBlobs.map((blob) => blob.text().then(JSON.parse).catch(() => null))
          ))
            .filter((n) => n?.id && n.createdAt && n.updatedAt)
            .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
        } else {
          notesData = [];
        }
        setNotes(notesData);
        await setInDB('notes', 'notes_data', notesData);
        await setInDB('notes', 'notes_timestamp', Date.now());
        //console.log('Notes loaded and saved:', notesData.length);
      }
      setLoadingState({ progress: 100, message: 'All set!' });
      await new Promise((resolve) => setTimeout(resolve, 500));
    } catch (err) {
      console.error('Error in loadData:', err);
      setError(err);
      showToast(`Failed to load data: ${err.message}`, 'error');
      setLoadingState({ progress: 100, message: 'Error syncing with Drive' });
    } finally {
      //console.log('loadData complete, setting isSyncing to false');
      setIsSyncing(false);
      setIsInitialSync(false);
    }
  }, [googleDriveApi, folderIds, notes, tags, showToast, shouldRefreshCache]);

  const syncToGoogleDrive = useCallback(async (currentTags = tags, currentNotes = notes) => {
    if (!googleDriveApi || !folderIds) {
      console.log('Drive not available, skipping sync');
      return;
    }

    setIsSyncing(true);
    try {
      const queue = await getSyncQueue();
      //console.log('Syncing to Google Drive with queue:', queue);
      for (const operation of queue) {
        const { type, data } = operation;
        //console.log(`Processing sync operation: ${type}`, data);
        switch (type) {
          case 'createNote': {
            const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
            await googleDriveApi.uploadFile(new File([blob], `${data.id}.json`), folderIds.notes);
            break;
          }
          case 'updateNote': {
            const { noteId, updates } = data;
            const note = currentNotes.find((n) => n.id === noteId);
            const updatedNote = { ...note, ...updates };
            const blob = new Blob([JSON.stringify(updatedNote)], { type: 'application/json' });
            const file = new File([blob], `${noteId}.json`);
            const { files } = await googleDriveApi.listFiles(folderIds.notes);
            const oldFile = files.find((f) => f.name === `${noteId}.json`);
            if (oldFile) await googleDriveApi.deleteFile(oldFile.id);
            await googleDriveApi.uploadFile(file, folderIds.notes);
            break;
          }
          case 'deleteNote': {
            const { noteId } = data;
            const { files } = await googleDriveApi.listFiles(folderIds.notes);
            const file = files.find((f) => f.name === `${noteId}.json`);
            if (file) await googleDriveApi.deleteFile(file.id);
            break;
          }
          case 'createTag':
          case 'updateTag':
          case 'deleteTag': {
            const blob = new Blob([JSON.stringify(currentTags)], { type: 'application/json' });
            const { files } = await googleDriveApi.listFiles(folderIds.tags);
            const oldFile = files.find((f) => f.name === 'tags.json');
            if (oldFile) await googleDriveApi.deleteFile(oldFile.id);
            await googleDriveApi.uploadFile(new File([blob], 'tags.json'), folderIds.tags);
            //console.log('Tags synced to Drive:', currentTags);
            break;
          }
          default:
            break;
        }
        await clearSyncItem(operation.id);
      }
    } catch (err) {
      console.error('Sync failed:', err);
      showToast('Failed to sync with Google Drive. Changes saved locally.', 'error');
    } finally {
      setIsSyncing(false);
    }
  }, [googleDriveApi, folderIds, tags, notes, showToast]);

  useEffect(() => {
    //console.log('Running initial load useEffect');
    loadInitialData().catch((err) => {
      console.error('Initial load failed:', err);
      showToast('Failed to load initial data', 'error');
    });
  }, [loadInitialData, showToast]);

  useEffect(() => {
    if (!isDriveLoading && googleDriveApi && folderIds && !hasLoadedFromDrive.current) {
      setLoadingState({ progress: 40, message: 'Checking local notes...' });
      //console.log('Drive ready, calling loadData');
      loadData();
      hasLoadedFromDrive.current = true;
    }
  }, [isDriveLoading, googleDriveApi, folderIds, loadData]);

  useEffect(() => {
    const interval = setInterval(() => syncToGoogleDrive(tags, notes), 5000);
    return () => clearInterval(interval);
  }, [syncToGoogleDrive, tags, notes]);

  const createNote = useCallback(
    async (noteData) => {
      try {
        const note = {
          id: crypto.randomUUID(),
          ...noteData,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        const updatedNotes = [note, ...notes];
        setNotes(updatedNotes);
        await setInDB('notes', 'notes_data', updatedNotes);
        await addToSyncQueue({ type: 'createNote', data: note });
        showToast('Note created', 'success');
        await syncToGoogleDrive(tags, updatedNotes);
        return note;
      } catch (err) {
        showToast(`Failed to create note: ${err.message}`, 'error');
        throw err;
      }
    },
    [notes, showToast, syncToGoogleDrive, tags]
  );

  const updateNote = useCallback(
    async (noteId, updates) => {
      try {
        const note = notes.find((n) => n.id === noteId);
        if (!note) throw new Error('Note not found');
        const updatedNote = { ...note, ...updates, updatedAt: new Date().toISOString() };
        const updatedNotes = notes.map((n) => (n.id === noteId ? updatedNote : n));
        setNotes(updatedNotes);
        await setInDB('notes', 'notes_data', updatedNotes);
        await addToSyncQueue({ type: 'updateNote', data: { noteId, updates } });
        showToast('Note updated', 'success');
        await syncToGoogleDrive(tags, updatedNotes);
        return updatedNote;
      } catch (err) {
        showToast(`Failed to update note: ${err.message}`, 'error');
        throw err;
      }
    },
    [notes, showToast, syncToGoogleDrive, tags]
  );

  const deleteNote = useCallback(
    async (noteId) => {
      try {
        const updatedNotes = notes.filter((n) => n.id !== noteId);
        setNotes(updatedNotes);
        await setInDB('notes', 'notes_data', updatedNotes);
        await addToSyncQueue({ type: 'deleteNote', data: { noteId } });
        showToast('Note deleted', 'success');
        await syncToGoogleDrive(tags, updatedNotes);
      } catch (err) {
        showToast(`Failed to delete note: ${err.message}`, 'error');
        throw err;
      }
    },
    [notes, showToast, syncToGoogleDrive, tags]
  );

  const createTag = useCallback(
    async (tagData) => {
      try {
        const newTag = { id: crypto.randomUUID(), name: tagData.name };
        const updatedTags = [...tags, newTag];
        setTags(updatedTags);
        await setInDB('tags', 'tags_data', updatedTags);
        await addToSyncQueue({ type: 'createTag', data: newTag });
        showToast('Tag created', 'success');
        await syncToGoogleDrive(updatedTags, notes);
        return newTag;
      } catch (err) {
        showToast(`Failed to create tag: ${err.message}`, 'error');
        throw err;
      }
    },
    [tags, showToast, syncToGoogleDrive, notes]
  );

  const updateTag = useCallback(
    async (tagId, updates) => {
      try {
        const updatedTags = tags.map((t) => (t.id === tagId ? { ...t, ...updates } : t));
        setTags(updatedTags);
        await setInDB('tags', 'tags_data', updatedTags);
        await addToSyncQueue({ type: 'updateTag', data: { tagId, updates } });
        showToast('Tag updated', 'success');
        await syncToGoogleDrive(updatedTags, notes);
      } catch (err) {
        showToast(`Failed to update tag: ${err.message}`, 'error');
        throw err;
      }
    },
    [tags, showToast, syncToGoogleDrive, notes]
  );

  const deleteTag = useCallback(
    async (tagId) => {
      try {
        const updatedTags = tags.filter((t) => t.id !== tagId);
        const updatedNotes = notes.map((n) => ({
          ...n,
          tags: n.tags?.filter((t) => t !== tagId) || [],
        }));
        setTags(updatedTags);
        setNotes(updatedNotes);
        await setInDB('tags', 'tags_data', updatedTags);
        await setInDB('notes', 'notes_data', updatedNotes);
        await addToSyncQueue({ type: 'deleteTag', data: { tagId } });
        showToast('Tag deleted', 'success');
        await syncToGoogleDrive(updatedTags, updatedNotes);
      } catch (err) {
        showToast(`Failed to delete tag: ${err.message}`, 'error');
        throw err;
      }
    },
    [notes, tags, showToast, syncToGoogleDrive]
  );

  const refreshData = useCallback(() => {
    hasLoadedFromDrive.current = false;
    loadData(true);
  }, [loadData]);

  return {
    notes,
    tags,
    isLoading,
    isSyncing,
    isInitialSync,
    error,
    createNote,
    updateNote,
    deleteNote,
    createTag,
    updateTag,
    deleteTag,
    refreshData,
    loadingState,
    googleDriveApi,
  };
}
