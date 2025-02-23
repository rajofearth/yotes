import { useState, useEffect, useCallback, useRef } from 'react';
import { useGoogleDrive } from '../contexts/GoogleDriveContext';
import { useToast } from '../contexts/ToastContext';

const CACHE_KEY = 'notes_cache';
const CACHE_TIMESTAMP_KEY = 'notes_cache_timestamp';
const TAGS_CACHE_KEY = 'tags_cache';
const TAGS_CACHE_TIMESTAMP_KEY = 'tags_cache_timestamp';
const CACHE_DURATION = 15 * 60 * 1000;

export function useNotes() {
    const { driveApi, folderIds, isLoading: isDriveLoading, isSignedOut } = useGoogleDrive();
    const [notes, setNotes] = useState(() => JSON.parse(localStorage.getItem(CACHE_KEY) || '[]'));
    const [tags, setTags] = useState(() => JSON.parse(localStorage.getItem(TAGS_CACHE_KEY) || '[]'));
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [loadingProgress, setLoadingProgress] = useState(0);
    const showToast = useToast();
    const loadCounter = useRef(0);

    const shouldRefreshCache = useCallback((key) => {
        const timestamp = localStorage.getItem(`${key}_timestamp`);
        return !timestamp || Date.now() - parseInt(timestamp) > CACHE_DURATION;
    }, []);

const loadData = useCallback(async (force = false) => {
        const count = ++loadCounter.current;
        if (!force && !shouldRefreshCache(CACHE_KEY) && !shouldRefreshCache(TAGS_CACHE_KEY)) {
            setIsLoading(false);
            setLoadingProgress(100);
            return;
        }
        if (!driveApi || !folderIds?.notes || !folderIds?.tags || isSignedOut) {
            setError(isSignedOut ? null : new Error('Drive API not initialized'));
            setIsLoading(false);
            setLoadingProgress(0);
            return;
        }

        setIsLoading(true);
        setError(null);
        setLoadingProgress(0);

        try {
            const updateProgress = (value) => count === loadCounter.current && setLoadingProgress(value);

            let tagsData = tags;
            if (force || shouldRefreshCache(TAGS_CACHE_KEY)) {
                const { files } = await driveApi.listFiles(folderIds.tags);
                updateProgress(20);
                const tagsFile = files.find(f => f.name === 'tags.json');
                if (tagsFile) {
                    const [tagsBlob] = await driveApi.downloadFiles([tagsFile.id]);
                    tagsData = JSON.parse(await tagsBlob.text());
                    updateProgress(40);
                }
                setTags(tagsData);
                localStorage.setItem(TAGS_CACHE_KEY, JSON.stringify(tagsData));
                localStorage.setItem(TAGS_CACHE_TIMESTAMP_KEY, Date.now().toString());
            }

            let notesData = notes;
            if (force || shouldRefreshCache(CACHE_KEY)) {
                const { files } = await driveApi.listFiles(folderIds.notes);
                updateProgress(60);
                if (files.length) {
                    const notesBlobs = await driveApi.downloadFiles(files.map(f => f.id));
                    notesData = (await Promise.all(
                        notesBlobs.filter(Boolean).map(blob => blob.text().then(JSON.parse))
                    ))
                        .filter(n => n?.id && n.createdAt && n.updatedAt)
                        .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
                    updateProgress(80);
                }
                setNotes(notesData);
                localStorage.setItem(CACHE_KEY, JSON.stringify(notesData));
                localStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
            }
            updateProgress(100);
        } catch (err) {
            setError(err);
            showToast(`Failed to load data: ${err.message}`, 'error');
            setLoadingProgress(0);
        } finally {
            setIsLoading(false);
        }
    }, [driveApi, folderIds, isSignedOut, notes, tags, shouldRefreshCache, showToast]);

    useEffect(() => {
        if (!isDriveLoading && !isSignedOut) loadData();
        else if (isSignedOut) {
            setIsLoading(false);
            setLoadingProgress(0);
        }
    }, [isDriveLoading, isSignedOut, loadData]);

    const createNote = useCallback(async (noteData) => {
        if (!driveApi || !folderIds?.notes || isSignedOut) throw new Error('Drive API not initialized');
        const note = { id: `note-${Date.now()}`, ...noteData, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
        const blob = new Blob([JSON.stringify(note)], { type: 'application/json' });
        await driveApi.uploadFile(new File([blob], `${note.id}.json`), folderIds.notes);
        setNotes((prev) => [note, ...prev]);
        localStorage.setItem(CACHE_KEY, JSON.stringify([note, ...notes]));
        localStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
        showToast('Note created', 'success');
        return note;
    }, [driveApi, folderIds?.notes, notes, isSignedOut, showToast]);

    const updateNote = useCallback(async (noteId, updates) => {
        if (!driveApi || !folderIds?.notes || isSignedOut) throw new Error('Drive API not initialized');
        const note = notes.find(n => n.id === noteId);
        if (!note) throw new Error('Note not found');
        const updatedNote = { ...note, ...updates, updatedAt: new Date().toISOString() };
        const blob = new Blob([JSON.stringify(updatedNote)], { type: 'application/json' });
        const file = new File([blob], `${noteId}.json`);
        const { files } = await driveApi.listFiles(folderIds.notes);
        const oldFile = files.find(f => f.name === `${noteId}.json`);
        if (oldFile) await driveApi.deleteFile(oldFile.id);
        await driveApi.uploadFile(file, folderIds.notes);
        setNotes((prev) => prev.map(n => n.id === noteId ? updatedNote : n));
        localStorage.setItem(CACHE_KEY, JSON.stringify(notes.map(n => n.id === noteId ? updatedNote : n)));
        localStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
        showToast('Note updated', 'success');
        return updatedNote;
    }, [driveApi, folderIds?.notes, notes, isSignedOut, showToast]);

    const deleteNote = useCallback(async (noteId) => {
        if (!driveApi || !folderIds?.notes || isSignedOut) throw new Error('Drive API not initialized');
        const { files } = await driveApi.listFiles(folderIds.notes);
        const file = files.find(f => f.name === `${noteId}.json`);
        if (!file) throw new Error('Note file not found');
        await driveApi.deleteFile(file.id);
        const updatedNotes = notes.filter(n => n.id !== noteId);
        setNotes(updatedNotes);
        localStorage.setItem(CACHE_KEY, JSON.stringify(updatedNotes));
        localStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
        //refreshData();
        showToast('Note deleted', 'success');
    }, [driveApi, folderIds?.notes, notes, isSignedOut, showToast]);

    const createTag = useCallback(async (tagData) => {
        if (!driveApi || !folderIds?.tags || isSignedOut) throw new Error('Drive API not initialized');
        const newTag = { id: `tag-${Date.now()}`, name: tagData.name };
        const updatedTags = [...tags, newTag];
        const blob = new Blob([JSON.stringify(updatedTags)], { type: 'application/json' });
        const { files } = await driveApi.listFiles(folderIds.tags);
        const oldFile = files.find(f => f.name === 'tags.json');
        if (oldFile) await driveApi.deleteFile(oldFile.id);
        await driveApi.uploadFile(new File([blob], 'tags.json'), folderIds.tags);
        setTags(updatedTags);
        localStorage.setItem(TAGS_CACHE_KEY, JSON.stringify(updatedTags));
        localStorage.setItem(TAGS_CACHE_TIMESTAMP_KEY, Date.now().toString());
        showToast('Tag created', 'success');
        return newTag;
    }, [driveApi, folderIds?.tags, tags, isSignedOut, showToast]);

    const updateTag = useCallback(async (tagId, updates) => {
        if (!driveApi || !folderIds?.tags || isSignedOut) throw new Error('Drive API not initialized');
        const updatedTags = tags.map(t => t.id === tagId ? { ...t, ...updates } : t);
        const blob = new Blob([JSON.stringify(updatedTags)], { type: 'application/json' });
        const { files } = await driveApi.listFiles(folderIds.tags);
        const oldFile = files.find(f => f.name === 'tags.json');
        if (oldFile) await driveApi.deleteFile(oldFile.id);
        await driveApi.uploadFile(new File([blob], 'tags.json'), folderIds.tags);
        setTags(updatedTags);
        localStorage.setItem(TAGS_CACHE_KEY, JSON.stringify(updatedTags));
        localStorage.setItem(TAGS_CACHE_TIMESTAMP_KEY, Date.now().toString());
        showToast('Tag updated', 'success');
    }, [driveApi, folderIds?.tags, tags, isSignedOut, showToast]);

    const deleteTag = useCallback(async (tagId) => {
        if (!driveApi || !folderIds?.tags || isSignedOut) throw new Error('Drive API not initialized');
        const updatedTags = tags.filter(t => t.id !== tagId);
        const blob = new Blob([JSON.stringify(updatedTags)], { type: 'application/json' });
        const { files } = await driveApi.listFiles(folderIds.tags);
        const oldFile = files.find(f => f.name === 'tags.json');
        if (oldFile) await driveApi.deleteFile(oldFile.id);
        await driveApi.uploadFile(new File([blob], 'tags.json'), folderIds.tags);
        setTags(updatedTags);
        setNotes((prev) => prev.map(n => ({ ...n, tags: n.tags?.filter(t => t !== tagId) || [] })));
        localStorage.setItem(TAGS_CACHE_KEY, JSON.stringify(updatedTags));
        localStorage.setItem(TAGS_CACHE_TIMESTAMP_KEY, Date.now().toString());
        localStorage.setItem(CACHE_KEY, JSON.stringify(notes.map(n => ({ ...n, tags: n.tags?.filter(t => t !== tagId) || [] }))));
        showToast('Tag deleted', 'success');
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
        loadingProgress
    };
}