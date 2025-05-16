import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useGoogleDrive } from './GoogleDriveContext';
import { setInDB, getFromDB, NOTES_STORE, TAGS_STORE } from '../utils/indexedDB';
import { pullChangesFromDrive } from '../utils/sync/pullChanges';
import { DRIVE_FOLDER_NAMES } from '../utils/driveStructure';
import { useOnlineStatus } from './OnlineStatusContext';

export const NotesContext = createContext();

export function NotesProvider({ children, session }) {
    const [notes, setNotes] = useState([]);
    const [tags, setTags] = useState([]);
    const [error, setError] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSyncing, setIsSyncing] = useState(false);
    const [isInitialSync, setIsInitialSync] = useState(true);
    const [loadingState, setLoadingState] = useState({ progress: 0, message: 'Initializing...' });
    const { driveApi, folderIds } = useGoogleDrive();
    const isOnline = useOnlineStatus();

    // Function to remove duplicates and clean up storage
    const deduplicateNotes = useCallback(async (notesList) => {
        if (!driveApi || !folderIds?.notes) return notesList;

        const noteMap = new Map();
        const duplicates = [];

        // Identify duplicates (keep the latest based on updatedAt)
        notesList.forEach(note => {
            if (noteMap.has(note.id)) {
                const existing = noteMap.get(note.id);
                if (new Date(note.updatedAt) > new Date(existing.updatedAt)) {
                    duplicates.push(existing); // Mark older version for deletion
                    noteMap.set(note.id, note); // Keep newer version
                } else {
                    duplicates.push(note); // Mark this one for deletion
                }
            } else {
                noteMap.set(note.id, note);
            }
        });

        const uniqueNotes = Array.from(noteMap.values());

        if (duplicates.length > 0 && isOnline) {
            console.log(`Found ${duplicates.length} duplicate notes to delete:`, duplicates.map(d => d.id));
            // Delete duplicates from Google Drive - skip if offline
            try {
                await Promise.all(
                    duplicates.map(async (note) => {
                        try {
                            const fileName = `${note.id}.json`;
                            const filesResponse = await driveApi.listFiles(folderIds.notes);
                            const file = filesResponse.files.find(f => f.name === fileName);
                            if (file) {
                                await driveApi.deleteFile(file.id);
                                console.log(`Deleted duplicate note ${note.id} from Google Drive`);
                            }
                        } catch (err) {
                            console.error(`Failed to delete duplicate note ${note.id} from Drive:`, err);
                        }
                    })
                );
            } catch (err) {
                console.error('Error during duplicate cleanup:', err);
            }

            // Update state and IndexedDB with unique notes
            setNotes(uniqueNotes);
            await setInDB(NOTES_STORE, 'notes_data', uniqueNotes);
            console.log('Updated notes in IndexedDB after deduplication');
        }

        return uniqueNotes;
    }, [driveApi, folderIds, isOnline]);

    // Force load from IndexedDB
    const loadFromIndexedDB = useCallback(async () => {
        try {
            console.log('NotesContext: Loading from IndexedDB');
            const cachedNotes = await getFromDB(NOTES_STORE, 'notes_data') || [];
            const cachedTags = await getFromDB(TAGS_STORE, 'tags_data') || [];
            
            // Don't deduplicate in offline mode to avoid API calls
            if (isOnline) {
                const cleanedNotes = await deduplicateNotes(cachedNotes);
                setNotes(cleanedNotes);
            } else {
                setNotes(cachedNotes);
            }
            
            setTags(cachedTags);
            return { notes: cachedNotes, tags: cachedTags };
        } catch (err) {
            console.error('Failed to load data from IndexedDB:', err);
            setError(err);
            return { notes: [], tags: [] };
        }
    }, [deduplicateNotes, isOnline]);

    // Initial data load with deduplication
    useEffect(() => {
        const loadData = async () => {
            if (!session) {
                setIsLoading(false);
                return;
            }

            try {
                setLoadingState({ progress: 50, message: 'Fetching notes...' });
                
                // Always load from IndexedDB first, especially important when offline
                const { notes: cachedNotes, tags: cachedTags } = await loadFromIndexedDB();
                
                // If we're offline, just use the IndexedDB data
                if (!isOnline) {
                    setLoadingState({ progress: 100, message: 'Using offline data' });
                    setIsLoading(false);
                    setIsInitialSync(false);
                    return;
                }
                
                // If online and drive API is ready, try to pull from drive
                if (driveApi && folderIds) {
                    const { notes: fetchedNotes, tags: fetchedTags } = await pullChangesFromDrive(driveApi, folderIds);

                    if (fetchedNotes) {
                        const cleanedNotes = await deduplicateNotes(fetchedNotes);
                        setNotes(cleanedNotes);
                    } 

                    if (fetchedTags) setTags(fetchedTags);
                }

                setLoadingState({ progress: 100, message: 'Data loaded' });
            } catch (err) {
                setError(err);
                console.error('Failed to load data:', err);
            } finally {
                setIsLoading(false);
                setIsInitialSync(false);
                
                // Force reset loading state after a timeout
                setTimeout(() => {
                    setLoadingState({ progress: 100, message: '' });
                }, 1000);
            }
        };
        loadData();
    }, [session, driveApi, folderIds, deduplicateNotes, loadFromIndexedDB, isOnline]);

    const createNote = useCallback(async (noteData) => {
        if (!isOnline && (!folderIds?.notes)) {
            // In offline mode, just save to IndexedDB
            const newNote = {
                id: crypto.randomUUID(),
                ...noteData,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            
            // Update local state
            setNotes(prev => [...prev, newNote]);
            
            // Save to IndexedDB
            await setInDB(NOTES_STORE, 'notes_data', [...notes, newNote]);
            return newNote;
        }
        
        // Online mode with Google Drive
        if (!folderIds?.notes) throw new Error('Notes folder not initialized');
        const newNote = {
            id: crypto.randomUUID(),
            ...noteData,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        const noteContent = JSON.stringify(newNote, null, 2);
        const noteBlob = new Blob([noteContent], { type: 'application/json' });
        const noteFile = new File([noteBlob], `${newNote.id}.json`, { type: 'application/json' });
        await driveApi.uploadFile(noteFile, folderIds.notes);

        // Update state and deduplicate
        setNotes(prev => {
            const updatedNotes = [...prev, newNote];
            deduplicateNotes(updatedNotes); // Async deduplication
            return updatedNotes;
        });
        await setInDB(NOTES_STORE, 'notes_data', [...notes, newNote]);
        return newNote;
    }, [driveApi, folderIds, notes, deduplicateNotes, isOnline]);

    const deleteNote = useCallback(async (noteId) => {
        if (!folderIds?.notes) throw new Error('Notes folder not initialized');
        const filesResponse = await driveApi.listFiles(folderIds.notes);
        const file = filesResponse.files.find(f => f.name === `${noteId}.json`);
        if (file) {
            await driveApi.deleteFile(file.id);
        }
        const updatedNotes = notes.filter(n => n.id !== noteId);
        setNotes(updatedNotes);
        await setInDB(NOTES_STORE, 'notes_data', updatedNotes);
    }, [driveApi, folderIds, notes]);

    const updateNote = useCallback(async (noteId, noteData) => {
        if (!folderIds?.notes) throw new Error('Notes folder not initialized');
        const existingNote = notes.find(n => n.id === noteId);
        if (!existingNote) throw new Error('Note not found');
        
        const updatedNote = { ...existingNote, ...noteData, updatedAt: new Date().toISOString() };
        const noteContent = JSON.stringify(updatedNote, null, 2);
        const noteBlob = new Blob([noteContent], { type: 'application/json' });
        const noteFile = new File([noteBlob], `${noteId}.json`, { type: 'application/json' });

        const filesResponse = await driveApi.listFiles(folderIds.notes);
        const file = filesResponse.files.find(f => f.name === `${noteId}.json`);
        if (file) {
            await driveApi.deleteFile(file.id);
        }
        await driveApi.uploadFile(noteFile, folderIds.notes);

        const updatedNotes = notes.map(n => (n.id === noteId ? updatedNote : n));
        setNotes(updatedNotes);
        await setInDB(NOTES_STORE, 'notes_data', updatedNotes);
        return updatedNote;
    }, [driveApi, folderIds, notes]);

    const createTag = useCallback(async (tagData) => {
        const newTag = { id: crypto.randomUUID(), ...tagData };
        const updatedTags = [...tags, newTag];
        const tagsContent = JSON.stringify(updatedTags, null, 2);
        const tagsBlob = new Blob([tagsContent], { type: 'application/json' });
        const tagsFile = new File([tagsBlob], 'tags.json', { type: 'application/json' });

        const filesResponse = await driveApi.listFiles(folderIds.tags);
        const existingFile = filesResponse.files.find(f => f.name === 'tags.json');
        if (existingFile) {
            await driveApi.deleteFile(existingFile.id);
        }
        await driveApi.uploadFile(tagsFile, folderIds.tags);

        setTags(updatedTags);
        await setInDB(TAGS_STORE, 'tags_data', updatedTags);
        return newTag;
    }, [driveApi, folderIds, tags]);

    const updateTag = useCallback(async (tagId, tagData) => {
        const updatedTags = tags.map(t => (t.id === tagId ? { ...t, ...tagData } : t));
        const tagsContent = JSON.stringify(updatedTags, null, 2);
        const tagsBlob = new Blob([tagsContent], { type: 'application/json' });
        const tagsFile = new File([tagsBlob], 'tags.json', { type: 'application/json' });

        const filesResponse = await driveApi.listFiles(folderIds.tags);
        const existingFile = filesResponse.files.find(f => f.name === 'tags.json');
        if (existingFile) {
            await driveApi.deleteFile(existingFile.id);
        }
        await driveApi.uploadFile(tagsFile, folderIds.tags);

        setTags(updatedTags);
        await setInDB(TAGS_STORE, 'tags_data', updatedTags);
        return updatedTags.find(t => t.id === tagId);
    }, [driveApi, folderIds, tags]);

    const deleteTag = useCallback(async (tagId) => {
        const updatedTags = tags.filter(t => t.id !== tagId);
        const tagsContent = JSON.stringify(updatedTags, null, 2);
        const tagsBlob = new Blob([tagsContent], { type: 'application/json' });
        const tagsFile = new File([tagsBlob], 'tags.json', { type: 'application/json' });

        const filesResponse = await driveApi.listFiles(folderIds.tags);
        const existingFile = filesResponse.files.find(f => f.name === 'tags.json');
        if (existingFile) {
            await driveApi.deleteFile(existingFile.id);
        }
        await driveApi.uploadFile(tagsFile, folderIds.tags);

        setTags(updatedTags);
        await setInDB(TAGS_STORE, 'tags_data', updatedTags);
        
        const updatedNotes = notes.map(note => ({
            ...note,
            tags: note.tags.filter(tId => tId !== tagId),
        }));
        setNotes(updatedNotes);
        await setInDB(NOTES_STORE, 'notes_data', updatedNotes);
    }, [driveApi, folderIds, tags, notes]);

    const refreshData = useCallback(async () => {
        setIsSyncing(true);
        try {
            const { notes: updatedNotes, tags: updatedTags } = await pullChangesFromDrive(driveApi, folderIds);
            if (updatedNotes) {
                const cleanedNotes = await deduplicateNotes(updatedNotes);
                setNotes(cleanedNotes);
            }
            if (updatedTags) setTags(updatedTags);
        } finally {
            setIsSyncing(false);
        }
    }, [driveApi, folderIds, deduplicateNotes]);

    const refreshFromIndexedDB = useCallback(async () => {
        await loadFromIndexedDB();
    }, [loadFromIndexedDB]);

    return (
        <NotesContext.Provider value={{
            notes,
            tags,
            error,
            isLoading,
            isSyncing,
            isInitialSync,
            loadingState,
            createNote,
            deleteNote,
            updateNote,
            createTag,
            updateTag,
            deleteTag,
            refreshData,
            refreshFromIndexedDB,
        }}>
            {children}
        </NotesContext.Provider>
    );
}

export const useNotes = () => useContext(NotesContext);