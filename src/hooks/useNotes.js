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
    pullChangesFromDrive, // Assuming pullChangesFromDrive is correctly implemented in indexedDB.js
    NOTES_STORE,
    TAGS_STORE
} from '../utils/indexedDB';

// Simple event emitter (can be moved to a separate file if reused)
class EventEmitter {
  constructor() { this.listeners = {}; }
  on(event, listener) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(listener);
  }
  emit(event, ...args) {
    if (this.listeners[event]) this.listeners[event].forEach(listener => listener(...args));
  }
  off(event, listener) {
    if (this.listeners[event]) this.listeners[event] = this.listeners[event].filter(l => l !== listener);
  }
}

const CACHE_DURATION = 15 * 60 * 1000; // 15 minutes (consider making configurable)

export function useNotes() {
    const { driveApi, folderIds, isLoading: isDriveLoading, error: driveError } = useGoogleDrive();
    const events = useMemo(() => new EventEmitter(), []);
    const [notes, setNotes] = useState([]);
    const [tags, setTags] = useState([]);
    const [isLoading, setIsLoading] = useState(true); // Loading state specific to notes data
    const [isSyncing, setIsSyncing] = useState(false);
    const [isInitialSync, setIsInitialSync] = useState(true); // Tracks the very first sync attempt
    const [error, setError] = useState(null);
    const [loadingState, setLoadingState] = useState({ progress: 5, message: 'Initializing...' });
    const showToast = useToast();

    const initialLocalLoadPerformedRef = useRef(false);
    const initialDriveLoadAttemptedRef = useRef(false); // Ref to track drive load attempt
    const syncQueueIntervalRef = useRef(null); // Ref for the sync interval timer

    // Function to check if cache needs refresh
    const shouldRefreshCache = useCallback(async (storeName) => {
        try {
            const timestamp = await getFromDB(storeName, `${storeName}_timestamp`);
            return !timestamp || Date.now() - timestamp > CACHE_DURATION;
        } catch (err) {
            console.warn(`Failed to check cache timestamp for ${storeName}:`, err);
            return true; // Assume refresh needed on error
        }
    }, []);

    // Load initial data from IndexedDB cache
    const loadInitialDataFromCache = useCallback(async () => {
        if (initialLocalLoadPerformedRef.current) return; // Run only once
        // console.log('useNotes: Loading initial data from cache...');
        setLoadingState({ progress: 10, message: 'Checking local notes...' });
        try {
            await openDB(); // Ensure DB is open
            const cachedNotes = (await getFromDB(NOTES_STORE, 'notes_data')) || [];
            const cachedTags = (await getFromDB(TAGS_STORE, 'tags_data')) || [];
            setNotes(cachedNotes);
            setTags(cachedTags);
            // console.log('useNotes: Cache load complete.');
            setLoadingState({ progress: 30, message: 'Local data checked' });
            initialLocalLoadPerformedRef.current = true;
        } catch (err) {
            console.error('useNotes: Failed to load initial data from IndexedDB:', err);
            setError(err);
            showToast('Error loading local data', 'error');
            setLoadingState({ progress: 100, message: 'Error loading local data' });
        }
    }, [showToast]);

    // Effect to load from cache on mount
    useEffect(() => {
        loadInitialDataFromCache();
    }, [loadInitialDataFromCache]);


    // Sync pending changes from queue to Google Drive
    const processSyncQueue = useCallback(async () => {
        if (!driveApi || !folderIds || isSyncing) {
             // console.log(`Skipping sync queue processing (driveApi=${!!driveApi}, folderIds=${!!folderIds}, isSyncing=${isSyncing})`);
             return;
        }
        // console.log('useNotes: Processing sync queue...');
        setIsSyncing(true);
        let currentNotes = notes; // Use state at the start of sync
        let currentTags = tags;   // Use state at the start of sync

        try {
            const queue = await getSyncQueue();
            if (queue.length === 0) {
                 // console.log('useNotes: Sync queue is empty.');
                 return;
            }

            // console.log(`useNotes: Sync queue has ${queue.length} items.`);
            // Create copies to avoid modifying state directly during loop
            let tempNotes = [...currentNotes];
            let tempTags = [...currentTags];

            for (const operation of queue) {
                const { type, data } = operation;
                try {
                    switch (type) {
                        case 'createNote': {
                            const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
                            await driveApi.uploadFile(new File([blob], `${data.id}.json`), folderIds.notes);
                            // Update local copy for subsequent operations if needed
                            tempNotes = [data, ...tempNotes.filter(n => n.id !== data.id)];
                            break;
                        }
                        case 'updateNote': {
                            const { noteId, updates } = data;
                             // Find based on tempNotes first, fallback to original state if somehow missing
                            const noteIndex = tempNotes.findIndex((n) => n.id === noteId);
                            const noteToUpdate = noteIndex !== -1 ? tempNotes[noteIndex] : currentNotes.find(n => n.id === noteId);

                            if (noteToUpdate) {
                                const updatedNote = { ...noteToUpdate, ...updates, updatedAt: new Date().toISOString() }; // Ensure fresh timestamp
                                const blob = new Blob([JSON.stringify(updatedNote)], { type: 'application/json' });
                                const file = new File([blob], `${noteId}.json`);

                                const { files } = await driveApi.listFiles(folderIds.notes);
                                const oldFile = files.find((f) => f.name === `${noteId}.json`);
                                if (oldFile) await driveApi.deleteFile(oldFile.id); // Replace strategy

                                await driveApi.uploadFile(file, folderIds.notes);
                                // Update local copy
                                tempNotes = tempNotes.map(n => n.id === noteId ? updatedNote : n);
                            } else {
                                 console.warn(`Sync: Note ${noteId} not found locally for update.`);
                            }
                            break;
                        }
                        case 'deleteNote': {
                            const { noteId } = data;
                            const { files } = await driveApi.listFiles(folderIds.notes);
                            const file = files.find((f) => f.name === `${noteId}.json`);
                            if (file) await driveApi.deleteFile(file.id);
                            // Update local copy
                            tempNotes = tempNotes.filter(n => n.id !== noteId);
                            break;
                        }
                        case 'createTag':
                        case 'updateTag':
                        case 'deleteTag': {
                            // Actions modify the tag list, then upload the *entire* list
                            if (type === 'createTag') tempTags = [...tempTags.filter(t => t.id !== data.id), data];
                            if (type === 'updateTag') tempTags = tempTags.map(t => t.id === data.tagId ? { ...t, ...data.updates } : t);
                            if (type === 'deleteTag') tempTags = tempTags.filter(t => t.id !== data.tagId);

                            const blob = new Blob([JSON.stringify(tempTags)], { type: 'application/json' });
                            const { files } = await driveApi.listFiles(folderIds.tags);
                            const oldFile = files.find((f) => f.name === 'tags.json');
                            if (oldFile) await driveApi.deleteFile(oldFile.id); // Replace strategy

                            await driveApi.uploadFile(new File([blob], 'tags.json'), folderIds.tags);
                            break;
                        }
                        default:
                            console.warn(`Unknown sync operation type: ${type}`);
                            break;
                    }
                    await clearSyncItem(operation.id); // Remove from queue only on success
                     // console.log(`Sync: Successfully processed ${type} for ${data.id || data.noteId || data.tagId || 'tags'}`);
                } catch (opError) {
                     console.error(`Sync: Failed to process operation ${operation.id} (${type}):`, opError);
                     showToast(`Sync error for ${type}. Changes might be delayed.`, 'error');
                     // Stop processing the queue on error to avoid potential data inconsistencies? Or continue?
                     // For now, let's stop to be safe. The item remains in the queue for next attempt.
                     throw opError; // Re-throw to exit the loop and trigger outer catch
                }
            }

            // If loop completed successfully, update main state with results
            setNotes(tempNotes);
            setTags(tempTags);
            await setInDB(NOTES_STORE, 'notes_data', tempNotes); // Persist final state
            await setInDB(TAGS_STORE, 'tags_data', tempTags);     // Persist final state
             // console.log('useNotes: Sync queue processing complete.');

        } catch (err) {
             console.error('useNotes: Error processing sync queue:', err);
             // Error already shown for specific operation failure
        } finally {
            setIsSyncing(false);
        }
    }, [driveApi, folderIds, notes, tags, showToast, isSyncing]); // Include isSyncing


    // Function to load/refresh data from Google Drive
    const loadDataFromDrive = useCallback(async (force = false) => {
        if (!driveApi || !folderIds || (!force && initialDriveLoadAttemptedRef.current)) {
            // console.log(`Skipping Drive load (driveApi=${!!driveApi}, folderIds=${!!folderIds}, force=${force}, attempted=${initialDriveLoadAttemptedRef.current})`);
            if (isInitialSync && !driveApi) setLoadingState(prev => ({ ...prev, message: 'Waiting for Google Drive...' }));
            return;
        }

        // console.log(`useNotes: Loading data from Drive (force=${force})...`);
        setIsLoading(true); // Indicate notes-specific loading
        setError(null);
        if (isInitialSync) setLoadingState({ progress: 40, message: 'Connecting to Google Drive...' });
        initialDriveLoadAttemptedRef.current = true; // Mark that we are attempting the load

        try {
            const notesRefreshNeeded = force || (await shouldRefreshCache(NOTES_STORE));
            const tagsRefreshNeeded = force || (await shouldRefreshCache(TAGS_STORE));

            if (!notesRefreshNeeded && !tagsRefreshNeeded) {
                // console.log('useNotes: Cache is fresh, no Drive load needed.');
                setIsLoading(false);
                if (isInitialSync) {
                     setIsInitialSync(false); // Mark initial sync as done even if cache was used
                     setLoadingState({ progress: 100, message: 'Data loaded from cache' });
                     await new Promise(resolve => setTimeout(resolve, 300)); // Brief pause
                }
                return;
            }

            if (isInitialSync) setLoadingState({ progress: 50, message: 'Fetching latest data...' });

            const { notes: fetchedNotes, tags: fetchedTags } = await pullChangesFromDrive(driveApi, folderIds);

            if (fetchedNotes) {
                // console.log(`useNotes: Fetched ${fetchedNotes.length} notes from Drive.`);
                setNotes(fetchedNotes);
                // No need to update DB here, pullChangesFromDrive already does it
            } else if (force) {
                 console.warn("useNotes: Forced refresh failed to fetch notes.");
                 // Optionally load from cache as fallback? Or show error?
                 const cachedNotes = (await getFromDB(NOTES_STORE, 'notes_data')) || [];
                 setNotes(cachedNotes);
            }

            if (fetchedTags) {
                // console.log(`useNotes: Fetched ${fetchedTags.length} tags from Drive.`);
                setTags(fetchedTags);
            } else if (force) {
                console.warn("useNotes: Forced refresh failed to fetch tags.");
                const cachedTags = (await getFromDB(TAGS_STORE, 'tags_data')) || [];
                setTags(cachedTags);
            }

            if (isInitialSync) {
                // console.log('useNotes: Initial Drive sync complete.');
                setLoadingState({ progress: 100, message: 'All set!' });
                await new Promise((resolve) => setTimeout(resolve, 500)); // UI pause
                setIsInitialSync(false); // Mark initial sync as done
            } else if (force) {
                 showToast('Data refreshed from Google Drive', 'success');
            }

        } catch (err) {
            console.error('useNotes: Error loading data from Drive:', err);
            setError(err);
            showToast(`Failed to load data from Drive: ${err.message}`, 'error');
            if (isInitialSync) setLoadingState({ progress: 100, message: 'Error syncing with Drive' });
            // Fallback to cache on error during initial sync?
             if (isInitialSync) {
                 try {
                    const cachedNotes = (await getFromDB(NOTES_STORE, 'notes_data')) || [];
                    const cachedTags = (await getFromDB(TAGS_STORE, 'tags_data')) || [];
                    setNotes(cachedNotes);
                    setTags(cachedTags);
                    console.warn("useNotes: Falling back to cached data due to Drive error during initial sync.");
                    setIsInitialSync(false); // Mark attempt as done, even with error
                 } catch (cacheErr) {
                     console.error("useNotes: Failed to load cache during error fallback:", cacheErr);
                 }
             }
        } finally {
            setIsLoading(false); // Notes loading finished (success or fail)
        }
    }, [driveApi, folderIds, isInitialSync, shouldRefreshCache, showToast]);


    // Effect to trigger initial Drive load when ready
    useEffect(() => {
        // Trigger only when Drive is ready AND initial load hasn't been attempted
        if (driveApi && folderIds && !isDriveLoading && !initialDriveLoadAttemptedRef.current) {
            // console.log('useNotes: Drive ready, triggering initial loadDataFromDrive.');
            loadDataFromDrive();
        }
    }, [driveApi, folderIds, isDriveLoading, loadDataFromDrive]);

    // Effect to set up periodic sync queue processing
     useEffect(() => {
        // Clear any previous interval
        if (syncQueueIntervalRef.current) {
            clearInterval(syncQueueIntervalRef.current);
        }

        // Start a new interval if Drive is available
        if (driveApi && folderIds) {
            // console.log('useNotes: Setting up periodic sync queue processing (every 10s).');
            syncQueueIntervalRef.current = setInterval(() => {
                processSyncQueue();
            }, 10000); // Sync every 10 seconds
        } else {
             // console.log('useNotes: Drive not ready, clearing sync interval.');
        }

        // Cleanup function to clear the interval when the component unmounts
        // or when driveApi/folderIds change (causing the effect to re-run)
        return () => {
            if (syncQueueIntervalRef.current) {
                // console.log('useNotes: Clearing sync queue interval.');
                clearInterval(syncQueueIntervalRef.current);
                syncQueueIntervalRef.current = null;
            }
        };
    }, [driveApi, folderIds, processSyncQueue]); // Depend on Drive readiness and the sync function


    // --- CRUD Operations ---

    const createNote = useCallback(async (noteData) => {
        if (!driveApi || !folderIds?.notes) {
             showToast('Google Drive not ready. Note saved locally.', 'info');
        }
        try {
            const note = {
                id: crypto.randomUUID(),
                ...noteData,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            };
            const updatedNotes = [note, ...notes];
            setNotes(updatedNotes); // Optimistic UI update
            await setInDB(NOTES_STORE, 'notes_data', updatedNotes);
            events.emit('notesUpdated');
            await addToSyncQueue({ type: 'createNote', data: note });
            showToast('Note created', 'success');
            // Trigger sync immediately in background (don't await)
            processSyncQueue().catch(e => console.error("Background sync trigger failed:", e));
            return note;
        } catch (err) {
            showToast(`Failed to create note: ${err.message}`, 'error');
            // Revert optimistic update? Maybe not necessary if only queueing failed.
            throw err;
        }
    }, [notes, driveApi, folderIds, showToast, processSyncQueue, events]);

    const updateNote = useCallback(async (noteId, updates) => {
         if (!driveApi || !folderIds?.notes) {
             showToast('Google Drive not ready. Note updated locally.', 'info');
         }
        try {
            const noteIndex = notes.findIndex((n) => n.id === noteId);
            if (noteIndex === -1) throw new Error('Note not found');

            const originalNote = notes[noteIndex];
            const updatedNote = { ...originalNote, ...updates, updatedAt: new Date().toISOString() };

            const updatedNotes = [...notes];
            updatedNotes[noteIndex] = updatedNote;

            setNotes(updatedNotes); // Optimistic UI update
            await setInDB(NOTES_STORE, 'notes_data', updatedNotes);
            events.emit('notesUpdated');
            // Queue the *changes* only for potentially smaller payload if sync logic handles it,
            // otherwise queue the full updated note. Let's queue changes.
            await addToSyncQueue({ type: 'updateNote', data: { noteId, updates } }); // Send only updates
            showToast('Note updated', 'success');
            processSyncQueue().catch(e => console.error("Background sync trigger failed:", e));
            return updatedNote;
        } catch (err) {
            showToast(`Failed to update note: ${err.message}`, 'error');
            throw err;
        }
    }, [notes, driveApi, folderIds, showToast, processSyncQueue, events]);

    const deleteNote = useCallback(async (noteId) => {
         if (!driveApi || !folderIds?.notes) {
             showToast('Google Drive not ready. Note deleted locally.', 'info');
         }
        try {
            const updatedNotes = notes.filter((n) => n.id !== noteId);
            setNotes(updatedNotes); // Optimistic UI update
            await setInDB(NOTES_STORE, 'notes_data', updatedNotes);
            events.emit('notesUpdated');
            await addToSyncQueue({ type: 'deleteNote', data: { noteId } });
            showToast('Note deleted', 'success');
            processSyncQueue().catch(e => console.error("Background sync trigger failed:", e));
        } catch (err) {
            showToast(`Failed to delete note: ${err.message}`, 'error');
            throw err;
        }
    }, [notes, driveApi, folderIds, showToast, processSyncQueue, events]);


    const createTag = useCallback(async (tagData) => {
        if (!driveApi || !folderIds?.tags) {
             showToast('Google Drive not ready. Tag saved locally.', 'info');
        }
        try {
            const newTag = {
                id: crypto.randomUUID(),
                name: tagData.name.trim(), // Ensure trimmed name
                color: tagData.color || 'bg-gray-500/20 text-gray-500', // Default color
            };
            if (!newTag.name) throw new Error("Tag name cannot be empty.");

            // Prevent duplicate tag names (case-insensitive check)
            if (tags.some(tag => tag.name.toLowerCase() === newTag.name.toLowerCase())) {
                 throw new Error(`Tag "${newTag.name}" already exists.`);
            }

            const updatedTags = [...tags, newTag];
            setTags(updatedTags); // Optimistic update
            await setInDB(TAGS_STORE, 'tags_data', updatedTags);
            await addToSyncQueue({ type: 'createTag', data: newTag });
            showToast('Tag created', 'success');
            processSyncQueue().catch(e => console.error("Background sync trigger failed:", e));
            return newTag;
        } catch (err) {
            showToast(`Failed to create tag: ${err.message}`, 'error');
            throw err;
        }
    }, [tags, driveApi, folderIds, showToast, processSyncQueue]);

    const updateTag = useCallback(async (tagId, updates) => {
         if (!driveApi || !folderIds?.tags) {
             showToast('Google Drive not ready. Tag updated locally.', 'info');
         }
        try {
            const tagName = updates.name?.trim();
            const tagColor = updates.color;

            if (tagName === "") throw new Error("Tag name cannot be empty.");

            const tagIndex = tags.findIndex((t) => t.id === tagId);
            if (tagIndex === -1) throw new Error('Tag not found');

            // Check for duplicate name if name is being changed
             if (tagName && tags.some(tag => tag.id !== tagId && tag.name.toLowerCase() === tagName.toLowerCase())) {
                throw new Error(`Tag name "${tagName}" is already in use.`);
             }

            const updatedTag = {
                ...tags[tagIndex],
                name: tagName || tags[tagIndex].name, // Update only if provided
                color: tagColor || tags[tagIndex].color,
            };

            const updatedTags = [...tags];
            updatedTags[tagIndex] = updatedTag;

            setTags(updatedTags); // Optimistic update
            await setInDB(TAGS_STORE, 'tags_data', updatedTags);
            // Queue the updates
            await addToSyncQueue({ type: 'updateTag', data: { tagId, updates: { name: updatedTag.name, color: updatedTag.color } } });
            showToast('Tag updated', 'success');
            processSyncQueue().catch(e => console.error("Background sync trigger failed:", e));
            return updatedTag;
        } catch (err) {
            showToast(`Failed to update tag: ${err.message}`, 'error');
            throw err;
        }
    }, [tags, driveApi, folderIds, showToast, processSyncQueue]);

    const deleteTag = useCallback(async (tagId) => {
         if (!driveApi || !folderIds?.tags) {
             showToast('Google Drive not ready. Tag deleted locally.', 'info');
         }
        try {
            const updatedTags = tags.filter((t) => t.id !== tagId);
            // Remove tag from notes
            const updatedNotes = notes.map((n) => ({
                ...n,
                tags: n.tags?.filter((t) => t !== tagId) || [],
                 // Potentially update note's updatedAt timestamp? Depends on requirements.
                 // updatedAt: new Date().toISOString()
            }));

            setTags(updatedTags); // Optimistic update
            setNotes(updatedNotes); // Optimistic update

            await setInDB(TAGS_STORE, 'tags_data', updatedTags);
            await setInDB(NOTES_STORE, 'notes_data', updatedNotes); // Save notes update too
            events.emit('notesUpdated');

            // Queue the delete operation for tags
            await addToSyncQueue({ type: 'deleteTag', data: { tagId } });
            // Queue updates for all affected notes (could be inefficient for many notes)
            // Alternatively, sync logic could handle tag removal implicitly?
            // Let's assume sync queue handles the full tags.json update for now.
             // We might still need to queue note updates if we modified their timestamps
             // for (const note of updatedNotes) {
             //    if (notes.find(n => n.id === note.id)?.tags?.includes(tagId)) { // If note was actually changed
             //        await addToSyncQueue({ type: 'updateNote', data: { noteId: note.id, updates: { tags: note.tags, updatedAt: note.updatedAt } } });
             //    }
             // }

            showToast('Tag deleted', 'success');
            processSyncQueue().catch(e => console.error("Background sync trigger failed:", e));
        } catch (err) {
            showToast(`Failed to delete tag: ${err.message}`, 'error');
            throw err;
        }
    }, [notes, tags, driveApi, folderIds, showToast, processSyncQueue, events]);


    // Manual refresh function
    const refreshData = useCallback(() => {
        // console.log("useNotes: Manual refresh triggered.");
        initialDriveLoadAttemptedRef.current = false; // Allow drive load attempt again
        loadDataFromDrive(true); // Force refresh from drive
    }, [loadDataFromDrive]);

    // Refresh state directly from IndexedDB (useful after operations)
    const refreshFromIndexedDB = useCallback(async () => {
        try {
            // console.log("useNotes: Refreshing from IndexedDB...");
            const cachedNotes = (await getFromDB(NOTES_STORE, 'notes_data')) || [];
            const cachedTags = (await getFromDB(TAGS_STORE, 'tags_data')) || [];
            setNotes(cachedNotes);
            setTags(cachedTags);
            // console.log("useNotes: Refreshed from IndexedDB.");
        } catch (err) {
            console.error('useNotes: Failed to refresh from IndexedDB:', err);
            showToast('Failed to refresh local data', 'error');
        }
    }, [showToast]);


    return {
        notes,
        tags,
        isLoading: isLoading || isDriveLoading, // Combine loading states for simplicity? Or keep separate? Let's combine for now.
        isSyncing,
        isInitialSync,
        error: error || driveError, // Combine errors
        createNote,
        updateNote,
        deleteNote,
        createTag,
        updateTag,
        deleteTag,
        refreshData,
        refreshFromIndexedDB,
        loadingState,
        events,
    };
}