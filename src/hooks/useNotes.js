import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useGoogleDrive } from '../contexts/GoogleDriveContext';
import { useToast } from '../contexts/ToastContext';
import { useOnlineStatus } from '../contexts/OnlineStatusContext';
import { openDB, getFromDB, setInDB, getSyncQueue, addToSyncQueue, clearSyncItem, NOTES_STORE, TAGS_STORE } from '../utils/indexedDB';
import { pullChangesFromDrive } from '../utils/sync/pullChanges';
import { checkDiscrepancies } from '../utils/sync/checkDiscrepancies';
import debounce from 'lodash/debounce';

// Simple event emitter
class EventEmitter {
  constructor() {
    this.listeners = {};
  }
  on(event, listener) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(listener);
  }
  emit(event, ...args) {
    if (this.listeners[event])
      this.listeners[event].forEach((listener) => listener(...args));
  }
  off(event, listener) {
    if (this.listeners[event])
      this.listeners[event] = this.listeners[event].filter(
        (l) => l !== listener
      );
  }
}

export function useNotes() {
  const {
    driveApi,
    folderIds,
    isLoading: isDriveLoading,
    error: driveError,
  } = useGoogleDrive();
  const isOnline = useOnlineStatus();
  const events = useMemo(() => new EventEmitter(), []);
  const [notes, setNotes] = useState([]);
  const [tags, setTags] = useState([]);
  const [isLoading, setIsLoading] = useState(true); // Tracks initial cache load
  const [isInitialSync, setIsInitialSync] = useState(true); // Tracks first load sequence
  const [error, setError] = useState(null);
  const [loadingState, setLoadingState] = useState({
    progress: 5,
    message: 'Initializing...',
  });
  const showToast = useToast();
  const initialLocalLoadPerformedRef = useRef(false);

  // State for Manual Sync
  const [isManualSyncing, setIsManualSyncing] = useState(false);
  const [syncProgressMessage, setSyncProgressMessage] = useState('');
  const [hasPendingChanges, setHasPendingChanges] = useState(false);
  const [syncDiscrepancyDetected, setSyncDiscrepancyDetected] = useState(false);
  // Ref to guard against overlapping discrepancy checks
  const discrepancyInFlightRef = useRef(false);

  // Global sync error reporting
  const [syncError, setSyncError] = useState(null);

  // Show a single toast when any sync error occurs
  useEffect(() => {
    if (syncError) {
      showToast(syncError.message || 'Error during synchronization', 'error');
      setSyncError(null);
    }
  }, [syncError, showToast]);

  // Function to check sync queue and update state
  const checkPendingChanges = useCallback(async () => {
    try {
      const queue = await getSyncQueue();
      setHasPendingChanges(queue.length > 0);
    } catch (err) {
      console.error('Error checking sync queue:', err);
      setHasPendingChanges(false); // Assume no changes if check fails
    }
  }, []);

  // Function to check for discrepancies between local state and Drive, with optional deep check and concurrency guard
  const checkSyncDiscrepancies = useCallback(async (deep = false) => {
    if (discrepancyInFlightRef.current) {
      return false;
    }
    if (!isOnline || !driveApi || !folderIds) {
      setSyncDiscrepancyDetected(false);
      return false;
    }
    discrepancyInFlightRef.current = true;
    try {
      const syncNeeded = await checkDiscrepancies(driveApi, folderIds, notes, tags, deep);
      setSyncDiscrepancyDetected(syncNeeded);
      return syncNeeded;
    } catch (err) {
      console.error('Error checking sync discrepancies:', err);
      setSyncError(err);
      return false;
    } finally {
      discrepancyInFlightRef.current = false;
    }
  }, [isOnline, driveApi, folderIds, notes, tags]);

  // Debounced wrapper for shallow discrepancy checks
  const debouncedShallowCheck = useMemo(
    () => debounce(() => checkSyncDiscrepancies(false), 500),
    [checkSyncDiscrepancies]
  );

  // Check for pending changes on mount and when online status changes
  useEffect(() => {
    checkPendingChanges();
    if (isOnline && driveApi && folderIds) {
      debouncedShallowCheck();
    }
    return () => {
      debouncedShallowCheck.cancel();
    };
  }, [checkPendingChanges, isOnline, driveApi, folderIds, debouncedShallowCheck]);

  // Initial Cache Load
  const loadInitialDataFromCache = useCallback(async () => {
    if (initialLocalLoadPerformedRef.current) return;
    setLoadingState({ progress: 10, message: 'Checking local notes...' });
    try {
      await openDB();
      const cachedNotes = (await getFromDB(NOTES_STORE, 'notes_data')) || [];
      const cachedTags = (await getFromDB(TAGS_STORE, 'tags_data')) || [];
      
      // Small delay for UI feedback
      await new Promise(r => setTimeout(r, 300));
      setLoadingState({ progress: 30, message: 'Local data loaded' });
      
      setNotes(cachedNotes);
      setTags(cachedTags);
      
      initialLocalLoadPerformedRef.current = true;
      await checkPendingChanges(); // Check queue after loading cache
      
      // If offline, immediately complete initialization process
      if (!navigator.onLine) {
        setLoadingState({ progress: 100, message: 'Using offline data' });
        setIsInitialSync(false); // End initialization sequence
      }
      
      setIsLoading(false); // Local load complete
    } catch (err) {
      console.error('Failed load from IndexedDB:', err);
      setError(err);
      showToast('Error loading local data', 'error');
      setLoadingState({ progress: 100, message: 'Error loading local data' });
      setIsLoading(false);
      setIsInitialSync(false); // Stop sequence on cache error
    }
  }, [showToast, checkPendingChanges]);

  useEffect(() => {
    loadInitialDataFromCache();
  }, [loadInitialDataFromCache]);

  // Manual Sync Function
  const manualSyncWithDrive = useCallback(async () => {
    if (!isOnline || !driveApi || !folderIds || isManualSyncing) {
      if (!isOnline) showToast('Connect to internet to sync.', 'info');
      if (isManualSyncing) showToast('Sync already in progress.', 'info');
      return;
    }

    setIsManualSyncing(true);
    setSyncProgressMessage('Starting sync...');
    let queue = [];
    let tempNotes = [...notes];
    let tempTags = [...tags];
    let syncErrorOccurred = false;
    let finalMessage = 'Sync complete.';
    let queueChanged = false; // Track if local state potentially updated
    let remoteOnlySync = false; // Flag for operations that only pulled remote changes

    try {
      queue = await getSyncQueue();
      
      // Even if there are no local changes, we still need to check for remote-local discrepancies
      if (queue.length === 0) {
        // Check if there are discrepancies between remote and local
        setSyncProgressMessage('Checking for discrepancies...');
        const syncNeeded = await checkDiscrepancies(driveApi, folderIds, notes, tags);
        
        if (!syncNeeded) {
          setSyncDiscrepancyDetected(false);
          finalMessage = 'No changes to sync.';
          return; // Exit early if no discrepancies
        }
        
        // If there are discrepancies but no local queue items, we need to pull from drive
        setSyncProgressMessage('Syncing with remote changes...');
        const { notes: pulledNotes, tags: pulledTags } = await pullChangesFromDrive(driveApi, folderIds, true);
        
        if (pulledNotes) setNotes(pulledNotes);
        if (pulledTags) setTags(pulledTags);
        
        setSyncDiscrepancyDetected(false);
        finalMessage = 'Remote changes integrated successfully.';
        remoteOnlySync = true;
        return;
      }

      setSyncProgressMessage(
        `Found ${queue.length} change${
          queue.length > 1 ? 's' : ''
        }. Processing...`
      );
      await new Promise((r) => setTimeout(r, 300));

      for (let i = 0; i < queue.length; i++) {
        const operation = queue[i];
        const { type, data } = operation;
        let operationHandled = false;
        const itemIdentifier = data.id || data.noteId || data.tagId || 'Tags';
        setSyncProgressMessage(
          `(${i + 1}/${queue.length}) Syncing ${type} ${itemIdentifier}...`
        );

        try {
          switch (type) {
            case 'createNote': {
              const blob = new Blob([JSON.stringify(data)], {
                type: 'application/json',
              });
              await driveApi.uploadFile(
                new File([blob], `${data.id}.json`),
                folderIds.notes
              );
              operationHandled = true;
              break;
            }
            case 'updateNote': {
              const { noteId, updates, updatedAt } = data;
              const idx = tempNotes.findIndex((n) => n.id === noteId);
              if (idx !== -1) {
                const note = {
                  ...tempNotes[idx],
                  ...updates,
                  updatedAt: updatedAt || new Date().toISOString(),
                };
                const blob = new Blob([JSON.stringify(note)], {
                  type: 'application/json',
                });
                const file = new File([blob], `${noteId}.json`);
                const { files } = await driveApi.listFiles(folderIds.notes);
                const old = files.find((f) => f.name === `${noteId}.json`);
                if (old) await driveApi.deleteFile(old.id);
                await driveApi.uploadFile(file, folderIds.notes);
                tempNotes[idx] = note;
                operationHandled = true;
                queueChanged = true;
              } else {
                console.warn(`Sync: Note ${noteId} not found loc. Clear op.`);
                operationHandled = true; // Clear operation if note missing locally
              }
              break;
            }
            case 'deleteNote': {
              const { noteId } = data;
              try {
                const { files } = await driveApi.listFiles(folderIds.notes);
                const file = files.find((f) => f.name === `${noteId}.json`);
                if (file) {
                  await driveApi.deleteFile(file.id);
                }
                // Always filter local state and mark handled, even if not found on Drive
                tempNotes = tempNotes.filter((n) => n.id !== noteId);
                operationHandled = true;
                queueChanged = true;
              } catch (delErr) {
                if (delErr instanceof Error && delErr.message.includes('404')) {
                  console.warn(
                    `Sync: Del ${noteId} 404. Assuming already deleted.`
                  );
                  tempNotes = tempNotes.filter((n) => n.id !== noteId);
                  operationHandled = true; // Treat 404 as handled
                  queueChanged = true;
                } else throw delErr; // Re-throw other errors
              }
              break;
            }
            case 'createTag':
            case 'updateTag':
            case 'deleteTag': {
              let currentSyncTags = [...tempTags];
              if (type === 'createTag')
                currentSyncTags = [
                  ...currentSyncTags.filter((t) => t.id !== data.id),
                  data,
                ];
              else if (type === 'updateTag')
                currentSyncTags = currentSyncTags.map((t) =>
                  t.id === data.tagId ? { ...t, ...data.updates } : t
                );
              else if (type === 'deleteTag')
                currentSyncTags = currentSyncTags.filter(
                  (t) => t.id !== data.tagId
                );
              const blob = new Blob([JSON.stringify(currentSyncTags)], {
                type: 'application/json',
              });
              const { files } = await driveApi.listFiles(folderIds.tags);
              const old = files.find((f) => f.name === 'tags.json');
              if (old) await driveApi.deleteFile(old.id);
              await driveApi.uploadFile(
                new File([blob], 'tags.json'),
                folderIds.tags
              );
              tempTags = currentSyncTags;
              operationHandled = true;
              queueChanged = true;
              break;
            }
            default:
              console.warn(`Unk sync op: ${type}`);
              operationHandled = true; // Clear unknown ops
              break;
          }

          if (operationHandled) {
            await clearSyncItem(operation.id);
          } else {
            throw new Error(`Unhandled sync operation: ${type}`);
          }
        } catch (opError) {
          console.error(
            `Sync: Failed op ${operation.id} (${type}):`,
            opError
          );
          syncErrorOccurred = true;
          finalMessage = `Sync failed on ${type} ${itemIdentifier}. Some changes were not synced. Please try again.`;
          setSyncProgressMessage(finalMessage);
          showToast(finalMessage, 'error');
          throw opError; // Stop processing queue
        }
      }

      // --- If loop completed without errors ---
      if (queueChanged) {
          setNotes(tempNotes); setTags(tempTags);
          await setInDB(NOTES_STORE, 'notes_data', tempNotes); await setInDB(TAGS_STORE, 'tags_data', tempTags);
      }
      setHasPendingChanges(false); // Queue should be empty now
      setSyncProgressMessage('Local changes saved to Google Drive.');
      await new Promise((r) => setTimeout(r, 500));

      // After pushing local changes, mark sync as successful
      finalMessage = 'Sync successful!';
    } catch (err) {
      // Catches errors re-thrown from the inner loop
      console.error('Error during manual sync process:', err);
      syncErrorOccurred = true;
      if (!finalMessage.includes('failed')) {
        finalMessage = 'An error occurred during sync. Please try again.';
        setSyncProgressMessage(finalMessage);
      }
      await checkPendingChanges(); // Re-check queue state after error
    } finally {
      // Removed redundant discrepancy re-check to reduce latency
      await new Promise((r) => setTimeout(r, syncErrorOccurred ? 1500 : 500));
      setIsManualSyncing(false);
      setSyncProgressMessage('');
      if (!syncErrorOccurred && (queue.length > 0 || remoteOnlySync)) { // Show success even for remote-only sync
        showToast(finalMessage, 'success');
      }
    }
  }, [
    isOnline, driveApi, folderIds, notes, tags,
    showToast, isManualSyncing, checkPendingChanges,
    checkSyncDiscrepancies
  ]);

  // loadDataFromDrive (Initial Load/Refresh Logic)
  const loadDataFromDrive = useCallback(
    async (force = false) => {
      // Add check to prevent reload when window regains focus unnecessarily
      if (!force && !isInitialSync && initialLocalLoadPerformedRef.current) {
        // Skip refetching if it's not a forced refresh and initial sync is done
        return;
      }
      
      if (!isOnline) {
        if (isInitialSync) setIsInitialSync(false);
        setIsLoading(false); // Stop loading indicator if offline
        return;
      }
      if (!driveApi || !folderIds) {
        if (isInitialSync)
          setLoadingState((prev) => ({
            ...prev,
            message: 'Waiting for Google Drive...',
          }));
        return;
      }
      // Use setIsLoading for drive fetch/check phase
      setIsLoading(true);
      setError(null);
      if (isInitialSync)
        setLoadingState({ progress: 40, message: 'Connecting to Google Drive...' });

      try {
        if (isInitialSync)
          setLoadingState({ progress: 50, message: 'Checking Drive...' });
        const { notes: fetchedNotes, tags: fetchedTags, cacheUsed } =
          await pullChangesFromDrive(driveApi, folderIds, force);

        if (!cacheUsed) {
          // Update state only if cache wasn't fresh (or forced)
          if (fetchedNotes) setNotes(fetchedNotes);
          if (fetchedTags) setTags(fetchedTags);
           if (force) showToast('Data refreshed from Google Drive', 'success');
        } else if (force) {
            // Update UI state from cache result if forced
             if (fetchedNotes) setNotes(fetchedNotes);
             if (fetchedTags) setTags(fetchedTags);
        }

        if (isInitialSync) {
          setLoadingState({ progress: 100, message: 'All set!' });
          await new Promise((r) => setTimeout(r, 300));
        }
      } catch (err) {
        console.error('Error loading data from Drive:', err);
        setError(err);
        showToast(`Failed sync: ${err.message}`, 'error');
        if (isInitialSync)
          setLoadingState({ progress: 100, message: 'Error syncing' });
      } finally {
        setIsLoading(false); // Drive fetch/check is done
        if (isInitialSync) setIsInitialSync(false); // Initial load sequence is done
      }
    },
    [isOnline, driveApi, folderIds, isInitialSync, showToast, pullChangesFromDrive]
  );

  // Effect to trigger initial drive check/load
  useEffect(() => {
    if (
      isOnline && driveApi && folderIds && !isDriveLoading &&
      initialLocalLoadPerformedRef.current && isInitialSync
    ) {
      loadDataFromDrive();
    } else if (!isOnline) {
      // Always immediately finish the loading sequence when offline
      setIsInitialSync(false);
      setIsLoading(false);
      setLoadingState({ progress: 100, message: 'Using offline data' });
    }
  }, [
    isOnline, driveApi, folderIds, isDriveLoading,
    loadDataFromDrive, isInitialSync,
  ]);

  // --- CRUD Operations (Save Locally + Queue) ---
  const createNote = useCallback(
    async (noteData) => {
      try {
        const now = new Date().toISOString();
        const note = {
          id: crypto.randomUUID(),
          ...noteData,
          createdAt: now,
          updatedAt: now,
        };
        const updatedNotes = [note, ...notes];
        setNotes(updatedNotes);
        await setInDB(NOTES_STORE, 'notes_data', updatedNotes);
        events.emit('notesUpdated');
        await addToSyncQueue({ type: 'createNote', data: note });
        setHasPendingChanges(true); // Mark pending changes
        showToast('Note saved locally', 'success');
        return note;
      } catch (err) {
        showToast(`Failed to save note: ${err.message}`, 'error');
        throw err;
      }
    },
    [notes, showToast, events]
  );

  const updateNote = useCallback(
    async (noteId, updates) => {
      try {
        const idx = notes.findIndex((n) => n.id === noteId);
        if (idx === -1) throw new Error('Note not found');
        const now = new Date().toISOString();
        const updatedNote = { ...notes[idx], ...updates, updatedAt: now };
        const updatedNotes = [...notes];
        updatedNotes[idx] = updatedNote;
        setNotes(updatedNotes);
        await setInDB(NOTES_STORE, 'notes_data', updatedNotes);
        events.emit('notesUpdated');
        await addToSyncQueue({
          type: 'updateNote',
          data: { noteId, updates, updatedAt: now },
        });
        setHasPendingChanges(true);
        showToast('Note updated locally', 'success');
        return updatedNote;
      } catch (err) {
        showToast(`Failed to update note: ${err.message}`, 'error');
        throw err;
      }
    },
    [notes, showToast, events]
  );

  const deleteNote = useCallback(
    async (noteId) => {
      try {
        const updatedNotes = notes.filter((n) => n.id !== noteId);
        setNotes(updatedNotes);
        await setInDB(NOTES_STORE, 'notes_data', updatedNotes);
        events.emit('notesUpdated');
        await addToSyncQueue({ type: 'deleteNote', data: { noteId } });
        setHasPendingChanges(true);
        showToast('Note deleted locally', 'success');
      } catch (err) {
        showToast(`Failed to delete note: ${err.message}`, 'error');
        throw err;
      }
    },
    [notes, showToast, events]
  );

  const createTag = useCallback(
    async (tagData) => {
      try {
        const newTag = {
          id: crypto.randomUUID(),
          name: tagData.name.trim(),
          color: tagData.color || 'bg-gray-500/20 text-gray-500',
        };
        if (!newTag.name) throw new Error('Tag name required.');
        if (
          tags.some((t) => t.name.toLowerCase() === newTag.name.toLowerCase())
        )
          throw new Error(`Tag "${newTag.name}" exists.`);
        const updatedTags = [...tags, newTag];
        setTags(updatedTags);
        await setInDB(TAGS_STORE, 'tags_data', updatedTags);
        await addToSyncQueue({ type: 'createTag', data: newTag });
        setHasPendingChanges(true);
        showToast('Tag saved locally', 'success');
        return newTag;
      } catch (err) {
        showToast(`Failed to save tag: ${err.message}`, 'error');
        throw err;
      }
    },
    [tags, showToast]
  );

  const updateTag = useCallback(
    async (tagId, updates) => {
      try {
        const name = updates.name?.trim();
        if (name === '') throw new Error('Tag name required.');
        const idx = tags.findIndex((t) => t.id === tagId);
        if (idx === -1) throw new Error('Tag not found');
        if (
          name &&
          tags.some(
            (t) => t.id !== tagId && t.name.toLowerCase() === name.toLowerCase()
          )
        )
          throw new Error(`Tag "${name}" exists.`);
        const updatedTag = {
          ...tags[idx],
          name: name || tags[idx].name,
          color: updates.color || tags[idx].color,
        };
        const updatedTags = [...tags];
        updatedTags[idx] = updatedTag;
        setTags(updatedTags);
        await setInDB(TAGS_STORE, 'tags_data', updatedTags);
        await addToSyncQueue({
          type: 'updateTag',
          data: {
            tagId,
            updates: { name: updatedTag.name, color: updatedTag.color },
          },
        });
        setHasPendingChanges(true);
        showToast('Tag updated locally', 'success');
        return updatedTag;
      } catch (err) {
        showToast(`Failed to update tag: ${err.message}`, 'error');
        throw err;
      }
    },
    [tags, showToast]
  );

  const deleteTag = useCallback(
    async (tagId) => {
      try {
        const updatedTags = tags.filter((t) => t.id !== tagId);
        const notesChanged = notes.some((n) => n.tags?.includes(tagId));
        const updatedNotes = notes.map((n) => {
          if (!n.tags?.includes(tagId)) return n;
          return {
            ...n,
            tags: n.tags.filter((t) => t !== tagId),
            updatedAt: new Date().toISOString(),
          };
        });
        setTags(updatedTags);
        await setInDB(TAGS_STORE, 'tags_data', updatedTags);
        await addToSyncQueue({ type: 'deleteTag', data: { tagId } });
        if (notesChanged) {
          setNotes(updatedNotes);
          await setInDB(NOTES_STORE, 'notes_data', updatedNotes);
          events.emit('notesUpdated');
          for (const note of updatedNotes) {
            if (notes.find((n) => n.id === note.id)?.tags?.includes(tagId)) {
              await addToSyncQueue({
                type: 'updateNote',
                data: {
                  noteId: note.id,
                  updates: { tags: note.tags },
                  updatedAt: note.updatedAt,
                },
              });
            }
          }
        }
        setHasPendingChanges(true);
        showToast('Tag deleted locally', 'success');
      } catch (err) {
        showToast(`Failed to delete tag: ${err.message}`, 'error');
        throw err;
      }
    },
    [notes, tags, showToast, events]
  );

  // Refresh from drive (force pull)
  const refreshData = useCallback(() => loadDataFromDrive(true), [
    loadDataFromDrive,
  ]);

  // Refresh from local cache
  const refreshFromIndexedDB = useCallback(async () => {
    try {
      const cachedNotes = (await getFromDB(NOTES_STORE, 'notes_data')) || [];
      const cachedTags = (await getFromDB(TAGS_STORE, 'tags_data')) || [];
      setNotes(cachedNotes);
      setTags(cachedTags);
    } catch (err) {
      console.error('Failed to refresh from IndexedDB:', err);
      showToast('Failed to refresh local data', 'error');
    }
  }, [showToast]);

  return {
    notes,
    tags,
    isLoading: isOnline ? (isLoading || isInitialSync) : false, // Never show loading when offline
    isInitialSync: isOnline ? isInitialSync : false, // Force isInitialSync off when offline
    error: error || driveError,
    createNote,
    updateNote,
    deleteNote,
    createTag,
    updateTag,
    deleteTag,
    refreshData, // Expose force refresh
    refreshFromIndexedDB,
    loadingState: isOnline ? loadingState : { progress: 100, message: 'Using offline data' }, // Override loading state when offline
    events,
    // --- Manual Sync Exports ---
    manualSyncWithDrive,
    isManualSyncing,
    syncProgressMessage,
    hasPendingChanges,
    syncDiscrepancyDetected,
    checkSyncDiscrepancies
  };
}