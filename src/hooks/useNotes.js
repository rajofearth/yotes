import { useState, useEffect, useCallback, useRef } from 'react'; // UPDATED: Import useRef
import { useGoogleDrive } from '../contexts/GoogleDriveContext';
import { useToast } from '../contexts/ToastContext';

const CACHE_KEY = 'notes_cache';
const CACHE_TIMESTAMP_KEY = 'notes_cache_timestamp';
const TAGS_CACHE_KEY = 'tags_cache';
const TAGS_CACHE_TIMESTAMP_KEY = 'tags_cache_timestamp'; // UPDATED: Added timestamp key for tags
const CACHE_DURATION = 15 * 60 * 1000; // Increased cache duration to 15 minutes

export function useNotes() {
    const { driveApi, folderIds, isLoading: isDriveLoading, isSignedOut } = useGoogleDrive();
    const [notes, setNotes] = useState(() => {
        const cached = localStorage.getItem(CACHE_KEY);
        return cached ? JSON.parse(cached) : [];
    });
    const [tags, setTags] = useState(() => {
        const cached = localStorage.getItem(TAGS_CACHE_KEY);
        return cached ? JSON.parse(cached) : [];
    });
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [loadingProgress, setLoadingProgress] = useState(0); // UPDATED: Progress state
    const showToast = useToast();
    const loadCounter = useRef(0);

    const shouldRefreshCache = useCallback((key) => {
        const timestamp = localStorage.getItem(`${key}_timestamp`);
        return !timestamp || Date.now() - parseInt(timestamp) > CACHE_DURATION;
    }, []);

    const loadData = useCallback(async (force = false) => {
        loadCounter.current += 1;
        const thisLoadCount = loadCounter.current;
        if (!force && !shouldRefreshCache(CACHE_KEY) && !shouldRefreshCache(TAGS_CACHE_KEY)) {
            console.log('Using cached data');
            setIsLoading(false);
            setLoadingProgress(100); // UPDATED: Set progress to 100%
            return;
        }

        if (!driveApi || !folderIds?.notes || !folderIds?.tags || isSignedOut) {
            setError(isSignedOut ? null : new Error('Drive API not initialized'));
            setIsLoading(false);
            setLoadingProgress(0); // UPDATED: Reset progress
            return;
        }

        setIsLoading(true);
        setError(null);
        setLoadingProgress(0); // UPDATED: Reset progress

        try {
            let tagsData = [];
            let notesData = [];
            let tagsResponse, notesResponse;
            let tagsFile, notesBlobs;

            // Function to update progress
            const updateProgress = (value) => {
                if (thisLoadCount === loadCounter.current){
                    setLoadingProgress(value);
                }
            };

            // Fetch Tags
            if (force || shouldRefreshCache(TAGS_CACHE_KEY)) {
                console.log('Fetching tags from Google Drive...');
                try {
                    tagsResponse = await driveApi.listFiles(folderIds.tags);
                    updateProgress(10);
                } catch (err) {
                    console.error('Failed to list tags files:', err);
                    throw new Error('Unable to list tags folder');
                }

                tagsFile = tagsResponse.files.find(f => f.name === 'tags.json');

                if (tagsFile) {
                    console.log('Downloading tags.json...');
                    let tagsBlob;
                    try {
                        tagsBlob = (await driveApi.downloadFiles([tagsFile.id]))[0];
                        updateProgress(20);
                    } catch (err) {
                        console.error('Failed to download tags.json:', err);
                        throw new Error('Unable to download tags.json');
                    }
                    if (tagsBlob) {
                        try {
                            tagsData = JSON.parse(await tagsBlob.text());
                            console.log('Tags loaded:', tagsData);
                            updateProgress(30);
                        } catch (err) {
                            console.error('Failed to parse tags.json:', err);
                            throw new Error('Invalid tags.json format');
                        }
                    }
                } else {
                    console.log('No tags.json found, using empty tags');
                }
                setTags(tagsData);
                localStorage.setItem(TAGS_CACHE_KEY, JSON.stringify(tagsData));
                localStorage.setItem(TAGS_CACHE_TIMESTAMP_KEY, Date.now().toString()); // UPDATED: Using the correct timestamp key

            } else {
                tagsData = JSON.parse(localStorage.getItem(TAGS_CACHE_KEY) || '[]');
                setTags(tagsData);
                updateProgress(30);
            }

            // Fetch Notes
            if (force || shouldRefreshCache(CACHE_KEY)) {
                console.log('Fetching notes from Google Drive...');

                try {
                    notesResponse = await driveApi.listFiles(folderIds.notes);
                    updateProgress(40);
                } catch (err) {
                    console.error('Failed to list notes files:', err);
                    throw new Error('Unable to list notes folder');
                }

                if (notesResponse.files.length > 0) {
                    try {
                        notesBlobs = await driveApi.downloadFiles(notesResponse.files.map(f => f.id));
                        updateProgress(60);
                    } catch (err) {
                        console.error('Failed to download notes:', err);
                        throw new Error('Unable to download notes');
                    }

                    notesData = await Promise.all(
                        notesBlobs.filter(Boolean).map(async (blob, index) => {
                            try {
                                return JSON.parse(await blob.text());
                            } catch (err) {
                                console.error(`Failed to parse note at index ${index}:`, err);
                                return null;
                            }
                        })
                    );
                    updateProgress(80);

                } else {
                    console.log('No notes found in folder');
                }

                const validNotes = notesData
                    .filter(note => note && note.id && note.createdAt && note.updatedAt)
                    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

                setNotes(validNotes);
                localStorage.setItem(CACHE_KEY, JSON.stringify(validNotes));
                localStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
                updateProgress(90);

            } else {
                notesData = JSON.parse(localStorage.getItem(CACHE_KEY) || '[]');
                setNotes(notesData);
                updateProgress(90);
            }

            updateProgress(100); // All data loaded

        } catch (err) {
            console.error('Error in loadData:', err);
            setError(err);
            showToast('Failed to load data: ' + err.message, 'error');
            setLoadingProgress(0);

        } finally {
            setIsLoading(false);
            if (thisLoadCount === loadCounter.current){
                setLoadingProgress(100);
            }
        }
    }, [driveApi, folderIds, isSignedOut, shouldRefreshCache, showToast]);

    useEffect(() => {
        if (!isDriveLoading && !isSignedOut) {
            loadData();
        } else if (isSignedOut) {
            setIsLoading(false);
            setLoadingProgress(0); // UPDATED: Reset progress
        }
    }, [isDriveLoading, isSignedOut, loadData]);

    const createNote = useCallback(async (noteData) => {
        if (!driveApi || !folderIds?.notes || isSignedOut) {
            throw new Error('Drive API not initialized');
        }
        const note = {
            id: `note-${Date.now()}`,
            ...noteData,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        try {
            const noteContent = JSON.stringify(note, null, 2);
            const blob = new Blob([noteContent], { type: 'application/json' });
            const file = new File([blob], `${note.id}.json`, { type: 'application/json' });
            await driveApi.uploadFile(file, folderIds.notes);
            const updatedNotes = [note, ...notes];
            setNotes(updatedNotes);
            localStorage.setItem(CACHE_KEY, JSON.stringify(updatedNotes));
            localStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
            showToast('Note created successfully', 'success');
            return note;
        } catch (err) {
            showToast('Failed to create note', 'error');
            throw err;
        }
    }, [driveApi, folderIds?.notes, notes, isSignedOut, showToast]);

    const updateNote = useCallback(async (noteId, updates) => {
        if (!driveApi || !folderIds?.notes || isSignedOut) {
            throw new Error('Drive API not initialized');
        }
        try {
            const noteToUpdate = notes.find(n => n.id === noteId);
            if (!noteToUpdate) throw new Error('Note not found');
            const updatedNote = {
                ...noteToUpdate,
                ...updates,
                updatedAt: new Date().toISOString()
            };
            const noteContent = JSON.stringify(updatedNote, null, 2);
            const blob = new Blob([noteContent], { type: 'application/json' });
            const file = new File([blob], `${noteId}.json`, { type: 'application/json' });
            const response = await driveApi.listFiles(folderIds.notes);
            const oldFile = response.files.find(f => f.name === `${noteId}.json`);
            if (oldFile) {
                await driveApi.deleteFile(oldFile.id);
            }
            await driveApi.uploadFile(file, folderIds.notes);
            const updatedNotes = notes.map(n => n.id === noteId ? updatedNote : n);
            setNotes(updatedNotes);
            localStorage.setItem(CACHE_KEY, JSON.stringify(updatedNotes));
            localStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
            showToast('Note updated successfully', 'success');
            return updatedNote;
        } catch (err) {
            showToast('Failed to update note', 'error');
            throw err;
        }
    }, [driveApi, folderIds?.notes, notes, isSignedOut, showToast]);

    const deleteNote = useCallback(async (noteId) => {
        if (!driveApi || !folderIds?.notes || isSignedOut) {
            throw new Error('Drive API not initialized');
        }
        try {
            const response = await driveApi.listFiles(folderIds.notes);
            const fileToDelete = response.files.find(f => f.name === `${noteId}.json`);
            if (!fileToDelete) throw new Error('Note file not found');
            await driveApi.deleteFile(fileToDelete.id);
            const updatedNotes = notes.filter(n => n.id !== noteId);
            setNotes(updatedNotes);
            localStorage.setItem(CACHE_KEY, JSON.stringify(updatedNotes));
            localStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
            showToast('Note deleted successfully', 'success');
        } catch (err) {
            showToast('Failed to delete note', 'error');
            throw err;
        }
    }, [driveApi, folderIds?.notes, notes, isSignedOut, showToast]);

    const createTag = useCallback(async (tagData) => {
        if (!driveApi || !folderIds?.tags || isSignedOut) {
            throw new Error('Drive API not initialized');
        }
        const newTag = { id: `tag-${Date.now()}`, name: tagData.name };
        const updatedTags = [...tags, newTag];
        const tagsContent = JSON.stringify(updatedTags, null, 2);
        const blob = new Blob([tagsContent], { type: 'application/json' });
        const file = new File([blob], 'tags.json', { type: 'application/json' });

        try {
            const tagsResponse = await driveApi.listFiles(folderIds.tags);
            const oldTagsFile = tagsResponse.files.find(f => f.name === 'tags.json');
            if (oldTagsFile) await driveApi.deleteFile(oldTagsFile.id);
            await driveApi.uploadFile(file, folderIds.tags);
            setTags(updatedTags);
            localStorage.setItem(TAGS_CACHE_KEY, JSON.stringify(updatedTags));
            localStorage.setItem(`${TAGS_CACHE_KEY}_timestamp`, Date.now().toString());
            showToast('Tag created successfully', 'success');
            return newTag;
        } catch (err) {
            showToast('Failed to create tag', 'error');
            throw err;
        }
    }, [driveApi, folderIds?.tags, tags, isSignedOut, showToast]);

    const updateTag = useCallback(async (tagId, updates) => {
        if (!driveApi || !folderIds?.tags || isSignedOut) {
            throw new Error('Drive API not initialized');
        }
        const updatedTags = tags.map(t => t.id === tagId ? { ...t, ...updates } : t);
        const tagsContent = JSON.stringify(updatedTags, null, 2);
        const blob = new Blob([tagsContent], { type: 'application/json' });
        const file = new File([blob], 'tags.json', { type: 'application/json' });

        try {
            const tagsResponse = await driveApi.listFiles(folderIds.tags);
            const oldTagsFile = tagsResponse.files.find(f => f.name === 'tags.json');
            if (oldTagsFile) await driveApi.deleteFile(oldTagsFile.id);
            await driveApi.uploadFile(file, folderIds.tags);
            setTags(updatedTags);
            localStorage.setItem(TAGS_CACHE_KEY, JSON.stringify(updatedTags));
            localStorage.setItem(`${TAGS_CACHE_KEY}_timestamp`, Date.now().toString());
            showToast('Tag updated successfully', 'success');
        } catch (err) {
            showToast('Failed to update tag', 'error');
            throw err;
        }
    }, [driveApi, folderIds?.tags, tags, isSignedOut, showToast]);

    const deleteTag = useCallback(async (tagId) => {
        if (!driveApi || !folderIds?.tags || isSignedOut) {
            throw new Error('Drive API not initialized');
        }
        const updatedTags = tags.filter(t => t.id !== tagId);
        const tagsContent = JSON.stringify(updatedTags, null, 2);
        const blob = new Blob([tagsContent], { type: 'application/json' });
        const file = new File([blob], 'tags.json', { type: 'application/json' });

        try {
            const tagsResponse = await driveApi.listFiles(folderIds.tags);
            const oldTagsFile = tagsResponse.files.find(f => f.name === 'tags.json');
            if (oldTagsFile) await driveApi.deleteFile(oldTagsFile.id);
            await driveApi.uploadFile(file, folderIds.tags);
            setTags(updatedTags);
            localStorage.setItem(TAGS_CACHE_KEY, JSON.stringify(updatedTags));
            localStorage.setItem(`${TAGS_CACHE_KEY}_timestamp`, Date.now().toString());
            showToast('Tag deleted successfully', 'success');

            const updatedNotes = notes.map(n => ({
                ...n,
                tags: n.tags ? n.tags.filter(t => t !== tagId) : []
            }));
            setNotes(updatedNotes);
            localStorage.setItem(CACHE_KEY, JSON.stringify(updatedNotes));
        } catch (err) {
            showToast('Failed to delete tag', 'error');
            throw err;
        }
    }, [driveApi, folderIds?.tags, tags, notes, isSignedOut, showToast]);

    const refreshData = useCallback(() => loadData(true), [loadData]);

    return {
        notes,
        tags,
        isLoading: isLoading || isDriveLoading,
        error,
        createNote,
        updateNote,
        deleteNote,
        createTag,
        updateTag,
        deleteTag,
        refreshData,
        loadingProgress // UPDATED: Expose loadingProgress
    };
}