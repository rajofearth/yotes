import { useState, useEffect, useCallback } from 'react';
import { useGoogleDrive } from '../contexts/GoogleDriveContext';
import { useToast } from '../contexts/ToastContext';

const CACHE_KEY = 'notes_cache';
const CACHE_TIMESTAMP_KEY = 'notes_cache_timestamp';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export function useNotes() {
    const { driveApi, folderIds, isLoading: isDriveLoading } = useGoogleDrive();
    const [notes, setNotes] = useState(() => {
        const cached = localStorage.getItem(CACHE_KEY);
        return cached ? JSON.parse(cached) : [];
    });
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const showToast = useToast();

    const shouldRefreshCache = useCallback(() => {
        const timestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY);
        if (!timestamp) return true;
        return Date.now() - parseInt(timestamp) > CACHE_DURATION;
    }, []);

    const loadNotes = useCallback(async (force = false) => {
        if (!driveApi || !folderIds?.notes) {
            setIsLoading(false);
            return;
        }

        // Use cache if available and not forced refresh
        if (!force && !shouldRefreshCache()) {
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            console.log('Fetching notes from folder:', folderIds.notes);
            // Get list of files with minimal fields
            const response = await driveApi.listFiles(folderIds.notes);
            
            if (!response.files?.length) {
                setNotes([]);
                localStorage.setItem(CACHE_KEY, JSON.stringify([]));
                localStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
                setIsLoading(false);
                return;
            }

            // Download all files in a single batch request
            const blobs = await driveApi.downloadFiles(response.files.map(f => f.id));
            
            // Process all notes in parallel
            const notesData = await Promise.all(
                blobs.map(async (blob, index) => {
                    try {
                        const text = await blob.text();
                        // Remove any BOM or invalid characters at the start
                        const cleanText = text.replace(/^\uFEFF/, '').trim();

                        if (!cleanText) {
                            return null;
                        }

                        try {
                            const parsed = JSON.parse(cleanText);
                            
                            // Validate note structure
                            if (!parsed.id || !parsed.title || !parsed.createdAt || !parsed.updatedAt) {
                                return null;
                            }

                            return parsed;
                        } catch (parseErr) {
                            return null;
                        }
                    } catch (err) {
                        return null;
                    }
                })
            );
            
            // Filter out any failed notes and sort by modified time
            const validNotes = notesData
                .filter(note => {
                    if (!note) return false;
                    if (!note.id || !note.createdAt || !note.updatedAt) {
                        return false;
                    }
                    return true;
                })
                .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
            
            // Update cache
            localStorage.setItem(CACHE_KEY, JSON.stringify(validNotes));
            localStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
            
            setNotes(validNotes);
        } catch (err) {
            setError(err);
            
            // Try to use cached data as fallback
            const cached = localStorage.getItem(CACHE_KEY);
            if (cached) {
                try {
                    const cachedNotes = JSON.parse(cached);
                    setNotes(cachedNotes);
                    showToast('Using cached notes due to loading error', 'warning');
                } catch (cacheErr) {
                    localStorage.removeItem(CACHE_KEY);
                    localStorage.removeItem(CACHE_TIMESTAMP_KEY);
                    setNotes([]);
                }
            }
        } finally {
            setIsLoading(false);
        }
    }, [driveApi, folderIds?.notes, shouldRefreshCache, showToast]);

    // Load notes when dependencies change
    useEffect(() => {
        if (!isDriveLoading) {
            loadNotes();
        }
    }, [loadNotes, isDriveLoading]);

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
            const uploadResult = await driveApi.uploadFile(file, folderIds.notes);
            
            // Update local state and cache
            const updatedNotes = [note, ...notes];
            setNotes(updatedNotes);
            localStorage.setItem(CACHE_KEY, JSON.stringify(updatedNotes));
            localStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
            
            showToast('Note created successfully', 'success');
            return note;
        } catch (err) {
            showToast('Failed to create note. Please try again.', 'error');
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

            // Find and delete the old file
            const response = await driveApi.listFiles(folderIds.notes);
            const oldFile = response.files.find(f => f.name === `${noteId}.json`);
            if (oldFile) {
                await driveApi.deleteFile(oldFile.id);
            }

            const uploadResult = await driveApi.uploadFile(file, folderIds.notes);

            // Update local state and cache
            const updatedNotes = notes.map(n => n.id === noteId ? updatedNote : n);
            setNotes(updatedNotes);
            localStorage.setItem(CACHE_KEY, JSON.stringify(updatedNotes));
            localStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());

            showToast('Note updated successfully', 'success');
            return updatedNote;
        } catch (err) {
            showToast('Failed to update note. Please try again.', 'error');
            throw err;
        }
    }, [driveApi, folderIds?.notes, notes, showToast]);

    return {
        notes,
        isLoading: isLoading || isDriveLoading,
        error,
        createNote,
        updateNote,
        refreshNotes: () => loadNotes(true)
    };
} 