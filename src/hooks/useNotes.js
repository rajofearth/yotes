import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
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
import { supabase } from '../utils/supabaseClient';
import { GoogleDriveAPI } from '../utils/googleDrive';

// Simple event emitter
class EventEmitter {
  constructor() {
    this.listeners = {};
  }

  on(event, listener) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(listener);
  }

  emit(event, ...args) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(listener => listener(...args));
    }
  }

  off(event, listener) {
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter(l => l !== listener);
    }
  }
}

const CACHE_DURATION = 15 * 60 * 1000; // 15 minutes

export function useNotes() {
    const { driveApi, folderIds, isLoading: isDriveLoading } = useGoogleDrive();
    const events = useMemo(() => new EventEmitter(), []);
    const [notes, setNotes] = useState([]);
    const [tags, setTags] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSyncing, setIsSyncing] = useState(false);
    const [isInitialSync, setIsInitialSync] = useState(true);
    const [error, setError] = useState(null);
    const [loadingState, setLoadingState] = useState({ progress: 5, message: 'Initializing...' });
    const showToastRaw = useToast();
    const hasLoadedFromDrive = useRef(false);
    const [googleDriveApi, setGoogleDriveApi] = useState(null);
    const [isRefreshingToken, setIsRefreshingToken] = useState(false);

    const showToast = useMemo(() => showToastRaw, []);

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
            if (error) throw error;
            const refreshToken = session?.refresh_token;
            if (!refreshToken) throw new Error('No refresh token available');
            const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
            const clientSecret = import.meta.env.VITE_GOOGLE_CLIENT_SECRET;
            const googleDrive = new GoogleDriveAPI('');
            const { provider_token, expires_in } = await googleDrive.refreshProviderToken(refreshToken, clientId, clientSecret);
            const { error: updateError } = await supabase.auth.updateSession({ provider_token, expires_in });
            if (updateError) throw updateError;
            setGoogleDriveApi(new GoogleDriveAPI(provider_token));
            showToast('Access token refreshed!', 'success');
        } catch (err) {
            console.error('Token refresh failed:', err);
            showToast(`Token refresh failed: ${err.message}`, 'error');
        } finally {
            setIsRefreshingToken(false);
        }
    }, [showToast]);

    useEffect(() => {
        const initializeGoogleDriveApi = async () => {
            setIsLoading(true);
            try {
                const { data: { session }, error } = await supabase.auth.getSession();
                if (error) throw error;
                if (session?.provider_token) {
                    console.log('Session provider token:', session.provider_token);
                    setGoogleDriveApi(new GoogleDriveAPI(session.provider_token));
                } else {
                    console.log('No provider token found in session.');
                }
            } catch (error) {
                console.error('Error initializing Google Drive API:', error);
                showToast(`Failed to initialize Google Drive API: ${error.message}`, 'error');
            }
        };
        initializeGoogleDriveApi();
    }, [showToast]);

    useEffect(() => {
        const refreshInterval = setInterval(refreshAccessToken, 30 * 60 * 1000);
        return () => clearInterval(refreshInterval);
    }, [refreshAccessToken]);

    const loadInitialData = useCallback(async () => {
        console.log('loadInitialData: Starting');
        setLoadingState({ progress: 10, message: 'Checking local notes...' });
        try {
            const cachedNotes = (await getFromDB('notes', 'notes_data')) || [];
            const cachedTags = (await getFromDB('tags', 'tags_data')) || [];
            setNotes(cachedNotes);
            setTags(cachedTags);
            setLoadingState({ progress: 30, message: 'Local data loaded' });
            console.log('loadInitialData: Complete');
            return { notes: cachedNotes, tags: cachedTags };
        } catch (err) {
            console.error('Failed to load initial data from IndexedDB:', err);
            setError(err);
            setLoadingState({ progress: 100, message: 'Error loading local data' });
            throw err;
        }
    }, []);

    const loadData = useCallback(async (force = false) => {
        if (!googleDriveApi || !folderIds?.notes || !folderIds?.tags) {
            console.log('loadData: Google Drive not ready');
            if (isInitialSync) setLoadingState({ progress: 40, message: 'Waiting for Google Drive...' });
            return;
        }

        setIsSyncing(true);
        setError(null);
        console.log('loadData: Starting sync');
        if (isInitialSync) setLoadingState({ progress: 40, message: 'Connecting to Google Drive...' });

        try {
            const notesRefreshNeeded = force || (await shouldRefreshCache('notes'));
            const tagsRefreshNeeded = force || (await shouldRefreshCache('tags'));

            let tagsData = tags;
            if (tagsRefreshNeeded) {
                console.log('loadData: Loading tags');
                if (isInitialSync) setLoadingState({ progress: 60, message: 'Loading tags...' });
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
                if (isInitialSync) setLoadingState({ progress: 80, message: 'Tags loaded' });
            }

            let notesData = notes;
            if (notesRefreshNeeded) {
                console.log('loadData: Loading notes');
                if (isInitialSync) setLoadingState({ progress: 90, message: 'Loading notes...' });
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
                events.emit('notesUpdated'); // Emit event after IndexedDB update
            }

            if (isInitialSync) {
                console.log('loadData: Finishing initial sync');
                setLoadingState({ progress: 100, message: 'All set!' });
                await new Promise((resolve) => setTimeout(resolve, 500));
            }
            console.log('loadData: Sync complete');
        } catch (err) {
            console.error('Error in loadData:', err);
            setError(err);
            showToast(`Failed to load data: ${err.message}`, 'error');
            if (isInitialSync) setLoadingState({ progress: 100, message: 'Error syncing with Drive' });
        } finally {
            setIsSyncing(false);
            if (isInitialSync) {
                setIsInitialSync(false);
                setIsLoading(false);
            }
        }
    }, [googleDriveApi, folderIds, notes, tags, shouldRefreshCache, isInitialSync, showToast, events]);

    const syncToGoogleDrive = useCallback(async (currentTags = tags, currentNotes = notes) => {
        if (!googleDriveApi || !folderIds) {
            console.log('Drive not available, skipping sync');
            return;
        }

        setIsSyncing(true);
        try {
            const queue = await getSyncQueue();
            for (const operation of queue) {
                const { type, data } = operation;
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
        console.log('useNotes: Loading initial data');
        loadInitialData().catch((err) => {
            console.error('Initial load failed:', err);
        });
    }, [loadInitialData]);

    useEffect(() => {
        if (!isDriveLoading && googleDriveApi && folderIds && !hasLoadedFromDrive.current) {
            console.log('useNotes: Loading from Drive');
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
                events.emit('notesUpdated'); // Emit event after IndexedDB update
                await addToSyncQueue({ type: 'createNote', data: note });
                showToast('Note created', 'success');
                await syncToGoogleDrive(tags, updatedNotes);
                return note;
            } catch (err) {
                showToast(`Failed to create note: ${err.message}`, 'error');
                throw err;
            }
        },
        [notes, showToast, syncToGoogleDrive, tags, events]
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
                events.emit('notesUpdated'); // Emit event after IndexedDB update
                await addToSyncQueue({ type: 'updateNote', data: { noteId, updates } });
                showToast('Note updated', 'success');
                await syncToGoogleDrive(tags, updatedNotes);
                return updatedNote;
            } catch (err) {
                showToast(`Failed to update note: ${err.message}`, 'error');
                throw err;
            }
        },
        [notes, showToast, syncToGoogleDrive, tags, events]
    );

const deleteNote = useCallback(
  async (noteId) => {
    try {
      const updatedNotes = notes.filter((n) => n.id !== noteId);
      setNotes(updatedNotes); // Update state immediately
      await setInDB('notes', 'notes_data', updatedNotes); // Update IndexedDB
      events.emit('notesUpdated'); // Emit event (optional, if hooked elsewhere)
      showToast('Note deleted', 'success'); // Toast ASAP
      await addToSyncQueue({ type: 'deleteNote', data: { noteId } }); // Queue sync
      // Run Drive sync in background
      syncToGoogleDrive(tags, updatedNotes).catch((err) => {
        console.error('Background sync failed:', err);
        showToast('Sync to Drive failed, note deleted locally', 'error');
      });
    } catch (err) {
      showToast(`Failed to delete note: ${err.message}`, 'error');
      throw err;
    }
  },
  [notes, showToast, syncToGoogleDrive, tags, events]
);

    const createTag = useCallback(
        async (tagData) => {
            try {
                const newTag = {
                    id: crypto.randomUUID(),
                    name: tagData.name,
                    color: tagData.color || 'bg-gray-500/20 text-gray-500',
                };
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
                const existingTag = tags.find((t) => t.id === tagId);
                if (!existingTag) throw new Error('Tag not found');
                const updatedTag = {
                    ...existingTag,
                    name: updates.name || existingTag.name,
                    color: updates.color || existingTag.color,
                };
                const updatedTags = tags.map((t) => (t.id === tagId ? updatedTag : t));
                setTags(updatedTags);
                await setInDB('tags', 'tags_data', updatedTags);
                await addToSyncQueue({ type: 'updateTag', data: { tagId, ...updatedTag } });
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
                events.emit('notesUpdated'); // Emit event after IndexedDB update
                await addToSyncQueue({ type: 'deleteTag', data: { tagId } });
                showToast('Tag deleted', 'success');
                await syncToGoogleDrive(updatedTags, updatedNotes);
            } catch (err) {
                showToast(`Failed to delete tag: ${err.message}`, 'error');
                throw err;
            }
        },
        [notes, tags, showToast, syncToGoogleDrive, events]
    );

    const refreshData = useCallback(() => {
        hasLoadedFromDrive.current = false;
        loadData(true);
    }, [loadData]);

    const refreshFromIndexedDB = useCallback(async () => {
        try {
            const cachedNotes = (await getFromDB('notes', 'notes_data')) || [];
            setNotes(cachedNotes);
        } catch (err) {
            console.error('Failed to refresh notes from IndexedDB:', err);
            showToast('Failed to refresh notes', 'error');
        }
    }, [showToast]);

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
        refreshFromIndexedDB,
        loadingState,
        googleDriveApi,
        events,
    };
}