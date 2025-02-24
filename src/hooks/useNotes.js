import { useState, useEffect, useCallback, useRef } from 'react';
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

const CACHE_DURATION = 15 * 60 * 1000; // 15 minutes

export function useNotes() {
  const { driveApi, folderIds, isLoading: isDriveLoading, isSignedOut } = useGoogleDrive();
  const [notes, setNotes] = useState([]);
  const [tags, setTags] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isInitialSync, setIsInitialSync] = useState(true); // Track first sync
  const [error, setError] = useState(null);
  const [loadingState, setLoadingState] = useState({ progress: 0, message: 'Initializing...' });
  const showToast = useToast();
  const hasLoadedFromDrive = useRef(false);

  const shouldRefreshCache = useCallback(async (storeName) => {
    try {
      const timestamp = await getFromDB(storeName, `${storeName}_timestamp`);
      return !timestamp || Date.now() - timestamp > CACHE_DURATION;
    } catch (err) {
      console.error(`Failed to check cache for ${storeName}:`, err);
      return true;
    }
  }, []);

  const loadInitialData = useCallback(async () => {
    setLoadingState({ progress: 10, message: 'Checking local notes...' });
    console.log('Loading initial data from IndexedDB...');
    try {
      const cachedNotes = (await getFromDB('notes', 'notes_data')) || [];
      const cachedTags = (await getFromDB('tags', 'tags_data')) || [];
      setNotes(cachedNotes);
      setTags(cachedTags);
      console.log('Initial data loaded:', { notes: cachedNotes.length, tags: cachedTags.length });
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
    if (!driveApi || !folderIds?.notes || !folderIds?.tags || isSignedOut) {
      console.log('Drive not ready or signed out, skipping loadData');
      setLoadingState({ progress: 40, message: 'Waiting for Google Drive...' });
      return;
    }

    setIsSyncing(true);
    setError(null);
    setLoadingState({ progress: 40, message: 'Connecting to Google Drive...' });
    console.log('Starting loadData...', { force });

    try {
      const notesRefreshNeeded = force || await shouldRefreshCache('notes');
      const tagsRefreshNeeded = force || await shouldRefreshCache('tags');

      let tagsData = tags;
      if (tagsRefreshNeeded) {
        setLoadingState({ progress: 60, message: 'Loading tags...' });
        console.log('Fetching tags from Google Drive...');
        const { files } = await driveApi.listFiles(folderIds.tags);
        const tagsFile = files.find((f) => f.name === 'tags.json');
        if (tagsFile) {
          const [tagsBlob] = await driveApi.downloadFiles([tagsFile.id]);
          tagsData = tagsBlob ? JSON.parse(await tagsBlob.text()) : [];
        } else {
          tagsData = [];
        }
        setTags(tagsData);
        await setInDB('tags', 'tags_data', tagsData);
        await setInDB('tags', 'tags_timestamp', Date.now());
        console.log('Tags loaded and saved:', tagsData.length);
        setLoadingState({ progress: 80, message: 'Tags loaded' });
      }

      let notesData = notes;
      if (notesRefreshNeeded) {
        setLoadingState({ progress: 90, message: 'Loading notes...' });
        console.log('Fetching notes from Google Drive...');
        const { files } = await driveApi.listFiles(folderIds.notes);
        if (files.length) {
          const notesBlobs = await driveApi.downloadFiles(files.map((f) => f.id));
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
        console.log('Notes loaded and saved:', notesData.length);
      }
      setLoadingState({ progress: 100, message: 'All set!' });
      // Delay to let user see completion
      await new Promise((resolve) => setTimeout(resolve, 500));
    } catch (err) {
      console.error('Error in loadData:', err);
      setError(err);
      showToast(`Failed to load data: ${err.message}`, 'error');
      setLoadingState({ progress: 100, message: 'Error syncing with Drive' });
    } finally {
      console.log('loadData complete, setting isSyncing to false');
      setIsSyncing(false);
      setIsInitialSync(false); // Mark initial sync complete
    }
  }, [driveApi, folderIds, isSignedOut, showToast]);

  const syncToGoogleDrive = useCallback(async () => {
    if (!driveApi || !folderIds || isSignedOut) return;

    setIsSyncing(true);
    // No loadingState updates here to keep it silent
    try {
      const queue = await getSyncQueue();
      for (const operation of queue) {
        const { type, data } = operation;
        switch (type) {
          case 'createNote': {
            const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
            await driveApi.uploadFile(new File([blob], `${data.id}.json`), folderIds.notes);
            break;
          }
          case 'updateNote': {
            const { noteId, updates } = data;
            const note = notes.find((n) => n.id === noteId);
            const updatedNote = { ...note, ...updates };
            const blob = new Blob([JSON.stringify(updatedNote)], { type: 'application/json' });
            const file = new File([blob], `${noteId}.json`);
            const { files } = await driveApi.listFiles(folderIds.notes);
            const oldFile = files.find((f) => f.name === `${noteId}.json`);
            if (oldFile) await driveApi.deleteFile(oldFile.id);
            await driveApi.uploadFile(file, folderIds.notes);
            break;
          }
          case 'deleteNote': {
            const { noteId } = data;
            const { files } = await driveApi.listFiles(folderIds.notes);
            const file = files.find((f) => f.name === `${noteId}.json`);
            if (file) await driveApi.deleteFile(file.id);
            break;
          }
          case 'createTag':
          case 'updateTag':
          case 'deleteTag': {
            const blob = new Blob([JSON.stringify(tags)], { type: 'application/json' });
            const { files } = await driveApi.listFiles(folderIds.tags);
            const oldFile = files.find((f) => f.name === 'tags.json');
            if (oldFile) await driveApi.deleteFile(oldFile.id);
            await driveApi.uploadFile(new File([blob], 'tags.json'), folderIds.tags);
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
  }, [driveApi, folderIds, isSignedOut, notes, tags, showToast]);

  useEffect(() => {
    console.log('Running initial load useEffect');
    loadInitialData().catch((err) => {
      console.error('Initial load failed:', err);
      showToast('Failed to load initial data', 'error');
    });
  }, [loadInitialData, showToast]);

  useEffect(() => {
    if (!hasLoadedFromDrive.current && !isDriveLoading && !isSignedOut && driveApi && folderIds) {
      console.log('Drive ready, calling loadData');
      loadData();
      hasLoadedFromDrive.current = true;
    }
  }, [isDriveLoading, isSignedOut, driveApi, folderIds, loadData]);

  useEffect(() => {
    const interval = setInterval(syncToGoogleDrive, 5000);
    return () => clearInterval(interval);
  }, [syncToGoogleDrive]);

  const createNote = useCallback(
    async (noteData) => {
      try {
        const note = {
          id: `note-${Date.now()}`,
          ...noteData,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        setNotes((prev) => [note, ...prev]);
        await setInDB('notes', 'notes_data', [note, ...notes]);
        await addToSyncQueue({ type: 'createNote', data: note });
        showToast('Note created', 'success');
        setTimeout(syncToGoogleDrive, 100);
        return note;
      } catch (err) {
        showToast(`Failed to create note: ${err.message}`, 'error');
        throw err;
      }
    },
    [notes, showToast, syncToGoogleDrive]
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
        setTimeout(syncToGoogleDrive, 100);
        return updatedNote;
      } catch (err) {
        showToast(`Failed to update note: ${err.message}`, 'error');
        throw err;
      }
    },
    [notes, showToast, syncToGoogleDrive]
  );

  const deleteNote = useCallback(
    async (noteId) => {
      try {
        const updatedNotes = notes.filter((n) => n.id !== noteId);
        setNotes(updatedNotes);
        await setInDB('notes', 'notes_data', updatedNotes);
        await addToSyncQueue({ type: 'deleteNote', data: { noteId } });
        showToast('Note deleted', 'success');
        setTimeout(syncToGoogleDrive, 100);
      } catch (err) {
        showToast(`Failed to delete note: ${err.message}`, 'error');
        throw err;
      }
    },
    [notes, showToast, syncToGoogleDrive]
  );

  const createTag = useCallback(
    async (tagData) => {
      try {
        const newTag = { id: `tag-${Date.now()}`, name: tagData.name };
        const updatedTags = [...tags, newTag];
        setTags(updatedTags);
        await setInDB('tags', 'tags_data', updatedTags);
        await addToSyncQueue({ type: 'createTag', data: newTag });
        showToast('Tag created', 'success');
        setTimeout(syncToGoogleDrive, 100);
        return newTag;
      } catch (err) {
        showToast(`Failed to create tag: ${err.message}`, 'error');
        throw err;
      }
    },
    [tags, showToast, syncToGoogleDrive]
  );

  const updateTag = useCallback(
    async (tagId, updates) => {
      try {
        const updatedTags = tags.map((t) => (t.id === tagId ? { ...t, ...updates } : t));
        setTags(updatedTags);
        await setInDB('tags', 'tags_data', updatedTags);
        await addToSyncQueue({ type: 'updateTag', data: { tagId, updates } });
        showToast('Tag updated', 'success');
        setTimeout(syncToGoogleDrive, 100);
      } catch (err) {
        showToast(`Failed to update tag: ${err.message}`, 'error');
        throw err;
      }
    },
    [tags, showToast, syncToGoogleDrive]
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
        setTimeout(syncToGoogleDrive, 100);
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
    isInitialSync, // Expose for ProtectedRoute
    error,
    createNote,
    updateNote,
    deleteNote,
    createTag,
    updateTag,
    deleteTag,
    refreshData,
    loadingState,
  };
}