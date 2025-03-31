import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useNotes } from '../../hooks/useNotes';
import { useToast } from '../../contexts/ToastContext';
import { NoteForm } from '../../components/note/NoteForm';
import { NoteEditorHeader } from '../../components/note/NoteEditorHeader';
import { TagManagementDialog } from '../../components/settings/TagManagementDialog';
import { Loader2 } from 'lucide-react';

export default function NoteEditor() {
  const { id: noteId } = useParams(); // Get note ID from params (if editing)
  const navigate = useNavigate();
  const { createNote, updateNote, notes, tags, createTag, isLoading: isNotesLoading } = useNotes();
  const showToast = useToast();

  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [note, setNote] = useState({
    title: '',
    description: '',
    content: '',
    tags: [],
  });
  const [isTagManagementOpen, setIsTagManagementOpen] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const titleInputRef = useRef(null);
  const descriptionRef = useRef(null);
  const contentRef = useRef(null);
  const isCreate = !noteId;

  useEffect(() => {
    if (noteId && !isNotesLoading) { // Wait for notes to load
      const existingNote = notes.find(n => n.id === noteId);
      if (existingNote) {
        setNote(existingNote);
        setLastSaved(new Date(existingNote.updatedAt || existingNote.createdAt));
      } else if (!isNotesLoading) {
        // Note not found, redirect to home
        showToast('Note not found', 'error');
        navigate('/', { replace: true });
        return;
      }
    } else if (isCreate) {
      setNote({
        title: '',
        description: '',
        content: '',
        tags: [],
      });
    }
  }, [noteId, notes, isNotesLoading, navigate, showToast, isCreate]);

  // Focus title input on initial mount
  useEffect(() => {
    if (titleInputRef.current) {
      titleInputRef.current.focus();
    }
  }, []);

  // Check for changes
  useEffect(() => {
    if (note && !isCreate) { // Only check for changes when editing
      const originalNote = notes.find(n => n.id === noteId);
      const changesDetected =
        originalNote?.title !== note.title ||
        originalNote?.description !== note.description ||
        originalNote?.content !== note.content ||
        JSON.stringify(originalNote?.tags) !== JSON.stringify(note.tags);
      setHasChanges(changesDetected);
    }
  }, [note, notes, isCreate, noteId]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (hasChanges && !isSaving) handleSave();
      }
      if (e.key === 'Escape') navigate('/');
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hasChanges, isSaving, navigate]);

  // Handle unsaved changes when navigating away
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasChanges) {
        const message = 'You have unsaved changes. Are you sure you want to leave?';
        e.returnValue = message;
        return message;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasChanges]);

  const handleSave = async () => {
    if (!hasChanges) return;
    setIsSaving(true);

    try {
      const now = new Date();
      if (isCreate) {
        await createNote({
          ...note,
          createdAt: now.toISOString(),
          updatedAt: now.toISOString(),
        });
        setLastSaved(now);
        setHasChanges(false); // Reset after save
        showToast('Note created successfully', 'success');
        navigate('/', { state: { resetFilters: true, refresh: true } });
      } else {
        await updateNote(noteId, { ...note, updatedAt: now.toISOString() });
        setLastSaved(now);
        showToast('Note updated successfully', 'success');
        navigate('/');
      }
    } catch (error) {
      showToast('Failed to save note', 'error');
      console.error('Save error:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleTagToggle = useCallback((tagId) => {
    setNote(prev => {
      const newTags = prev.tags.includes(tagId)
        ? prev.tags.filter(id => id !== tagId)
        : [...prev.tags, tagId];
      return { ...prev, tags: newTags };
    });
    setHasChanges(true);
  }, []);

  const handleCreateTag = async (action, data) => {
    if (action === 'create' && data?.name) {
      try {
        const newTag = await createTag({ name: data.name, color: data.color || 'bg-gray-500/20 text-gray-500' });
        setNote(prev => ({ ...prev, tags: [...prev.tags, newTag.id] }));
        showToast(`Tag "${data.name}" created and added`, 'success');
      } catch (error) {
        showToast(`Failed to create tag: ${error.message}`, 'error');
        console.error('Tag creation error:', error);
      }
    }
  };

  if (noteId && isNotesLoading) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-primary flex flex-col">
      <NoteEditorHeader
        note={note}
        onNoteChange={setNote}
        isSaving={isSaving}
        hasChanges={hasChanges}
        lastSaved={lastSaved}
        onSave={handleSave}
        titleInputRef={titleInputRef}
      />
      <main className="flex-1 max-w-[1920px] mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 sm:space-y-8 w-full">
        <NoteForm
          note={note}
          onNoteChange={setNote}
          descriptionRef={descriptionRef}
          contentRef={contentRef}
          titleInputRef={titleInputRef} // Pass the ref
          tags={tags}
          onTagToggle={handleTagToggle}
          onCreateTag={handleCreateTag}
        />
      </main>
      {/* Tag Management Dialog */}
      <TagManagementDialog open={isTagManagementOpen} onOpenChange={setIsTagManagementOpen} />
    </div>
  );
}