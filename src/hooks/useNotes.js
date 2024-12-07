import { useState, useEffect } from 'react';
import { useGoogleDrive } from '../contexts/GoogleDriveContext';
import { useToast } from '../contexts/ToastContext';

export function useNotes() {
    const { driveApi, folderIds } = useGoogleDrive();
    const [notes, setNotes] = useState([]);
    const [tags, setTags] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const showToast = useToast();

    useEffect(() => {
        loadNotes();
    }, [driveApi, folderIds]);

    const loadNotes = async () => {
        if (!driveApi || !folderIds) return;

        setIsLoading(true);
        try {
            const response = await driveApi.listFiles(folderIds.notes);
            const notesData = await Promise.all(
                response.files.map(async (file) => {
                    const blob = await driveApi.downloadFile(file.id);
                    const text = await blob.text();
                    return JSON.parse(text);
                })
            );
            setNotes(notesData);
        } catch (err) {
            setError(err);
            console.error('Failed to load notes:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const createNote = async (noteData) => {
        const note = {
            id: `note-${Date.now()}`,
            ...noteData,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        const noteContent = JSON.stringify(note, null, 2);
        const blob = new Blob([noteContent], { type: 'application/json' });
        const file = new File([blob], `${note.id}.json`, { type: 'application/json' });

        await driveApi.uploadFile(file, folderIds.notes);
        await loadNotes(); // Reload notes
        return note;
    };

    const updateNote = async (noteId, updates) => {
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

        await driveApi.uploadFile(file, folderIds.notes);
        await loadNotes(); // Reload notes
        return updatedNote;
    };

    const deleteNote = async (noteId) => {
        try {
            const response = await driveApi.listFiles(folderIds.notes);
            const file = response.files.find(f => f.name === `${noteId}.json`);
            if (file) {
                await driveApi.deleteFile(file.id);
                
                // Update local state
                const deletedNote = notes.find(n => n.id === noteId);
                const updatedNotes = notes.filter(n => n.id !== noteId);
                setNotes(updatedNotes);

                // Check if we need to remove any tags
                if (deletedNote?.tags) {
                    const allRemainingTags = updatedNotes.flatMap(n => n.tags || []);
                    const updatedTags = tags.filter(tag => 
                        allRemainingTags.includes(tag.id) || tag.id === 'getting-started'
                    );

                    if (updatedTags.length !== tags.length) {
                        setTags(updatedTags);
                        await updateTagsFile(updatedTags);
                    }
                }

                showToast('Note deleted successfully', 'success');
            }
        } catch (error) {
            console.error('Failed to delete note:', error);
            showToast('Failed to delete note', 'error');
        }
    };

    // Load tags
    const loadTags = async () => {
        try {
            const response = await driveApi.listFiles(folderIds.tags);
            const tagsFile = response.files.find(f => f.name === 'tags.json');
            if (tagsFile) {
                const blob = await driveApi.downloadFile(tagsFile.id);
                const text = await blob.text();
                setTags(JSON.parse(text));
            }
        } catch (err) {
            console.error('Failed to load tags:', err);
        }
    };

    // Update tags file
    const updateTagsFile = async (newTags) => {
        const tagsContent = JSON.stringify(newTags, null, 2);
        const tagsBlob = new Blob([tagsContent], { type: 'application/json' });
        const tagsFile = new File([tagsBlob], 'tags.json', { type: 'application/json' });

        const response = await driveApi.listFiles(folderIds.tags);
        const existingFile = response.files.find(f => f.name === 'tags.json');
        if (existingFile) {
            await driveApi.deleteFile(existingFile.id);
        }
        await driveApi.uploadFile(tagsFile, folderIds.tags);
    };

    return {
        notes,
        tags,
        isLoading,
        error,
        createNote,
        updateNote,
        deleteNote,
        refreshNotes: loadNotes
    };
} 