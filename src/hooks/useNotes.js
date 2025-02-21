import { useState, useEffect, useCallback } from 'react';
import { useGoogleDrive } from '../contexts/GoogleDriveContext';
import { useToast } from '../contexts/ToastContext';

const CACHE_KEY = 'notes_cache';
const CACHE_TIMESTAMP_KEY = 'notes_cache_timestamp';
const TAGS_CACHE_KEY = 'tags_cache';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export function useNotes() {
    const { driveApi, folderIds, isLoading: isDriveLoading } = useGoogleDrive();
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
    const showToast = useToast();

    const shouldRefreshCache = useCallback((key) => {
        const timestamp = localStorage.getItem(`${key}_timestamp`);
        return !timestamp || Date.now() - parseInt(timestamp) > CACHE_DURATION;
    }, []);

    const loadData = useCallback(async (force = false) => {
        if (!driveApi || !folderIds?.notes || !folderIds?.tags) {
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            // Load tags from tags.json
            if (force || shouldRefreshCache(TAGS_CACHE_KEY)) {
                const tagsResponse = await driveApi.listFiles(folderIds.tags);
                const tagsFile = tagsResponse.files.find(f => f.name === 'tags.json');
                let tagsData = [];
                if (tagsFile) {
                    const tagsBlob = (await driveApi.downloadFiles([tagsFile.id]))[0];
                    if (tagsBlob) tagsData = JSON.parse(await tagsBlob.text());
                }
                setTags(tagsData);
                localStorage.setItem(TAGS_CACHE_KEY, JSON.stringify(tagsData));
                localStorage.setItem(`${TAGS_CACHE_KEY}_timestamp`, Date.now().toString());
            }

            // Load notes
            if (force || shouldRefreshCache(CACHE_KEY)) {
                const notesResponse = await driveApi.listFiles(folderIds.notes);
                const notesBlobs = await driveApi.downloadFiles(notesResponse.files.map(f => f.id));
                const notesData = await Promise.all(
                    notesBlobs.filter(Boolean).map(async (blob) => {
                        try {
                            return JSON.parse(await blob.text());
                        } catch {
                            return null;
                        }
                    })
                );
                const validNotes = notesData
                    .filter(note => note && note.id && note.createdAt && note.updatedAt)
                    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
                setNotes(validNotes);
                localStorage.setItem(CACHE_KEY, JSON.stringify(validNotes));
                localStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
            }
        } catch (err) {
            setError(err);
            showToast('Failed to load data', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [driveApi, folderIds, shouldRefreshCache, showToast]);

    useEffect(() => {
        if (!isDriveLoading) loadData();
    }, [loadData, isDriveLoading]);

    const createNote = useCallback(async (noteData) => {
        if (!driveApi || !folderIds?.notes) {
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
    }, [driveApi, folderIds?.notes, notes, showToast]);

    const updateNote = useCallback(async (noteId, updates) => {
        if (!driveApi || !folderIds?.notes) {
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
    }, [driveApi, folderIds?.notes, notes, showToast]);

    const deleteNote = useCallback(async (noteId) => {
        if (!driveApi || !folderIds?.notes) {
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
    }, [driveApi, folderIds?.notes, notes, showToast]);

    const createTag = useCallback(async (tagData) => {
        if (!driveApi || !folderIds?.tags) {
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
    }, [driveApi, folderIds?.tags, tags, showToast]);

    const updateTag = useCallback(async (tagId, updates) => {
        if (!driveApi || !folderIds?.tags) {
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
    }, [driveApi, folderIds?.tags, tags, showToast]);

    const deleteTag = useCallback(async (tagId) => {
        if (!driveApi || !folderIds?.tags) {
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
    }, [driveApi, folderIds?.tags, tags, notes, showToast]);

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
        refreshData: () => loadData(true)
    };
}