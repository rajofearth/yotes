import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useNotes } from '../../hooks/useNotes';
import { useToast } from '../../contexts/ToastContext';
import { NoteForm } from '../../components/note/NoteForm';
import { NoteEditorHeader } from '../../components/note/NoteEditorHeader';
import { TagManagementDialog } from '../../components/settings/TagManagementDialog';
import { Loader2 } from 'lucide-react';
import { generateNoteFromImage } from '../../utils/aiImageService';

export default function NoteEditor() {
  const { id: noteId } = useParams(); // Get note ID from params (if editing)
  const navigate = useNavigate();
  const location = useLocation();
  const { createNote, updateNote, notes, tags, createTag, isLoading: isNotesLoading, allTags } = useNotes();
  const showToast = useToast();

  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [note, setNote] = useState({
    title: '',
    description: '',
    content: '',
    tags: [],
  });
  const [isImportingImage, setIsImportingImage] = useState(false);
  const [isTagManagementOpen, setIsTagManagementOpen] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const titleInputRef = useRef(null);
  const descriptionRef = useRef(null);
  const contentRef = useRef(null);
  const isCreate = !noteId;
  // Ref to ensure image data is applied only once
  const appliedImageData = useRef(false);
  
  // Handle importing note fields from an image (moved up and using useCallback)
  const handleImportImage = useCallback(async (file) => {
    setIsImportingImage(true);
    try {
      const fields = await generateNoteFromImage(file);
      // Update note with returned fields
      setNote(prev => ({
        ...prev,
        title: fields.title || prev.title,
        description: fields.description || prev.description,
        content: fields.content || prev.content,
      }));
      setHasChanges(true);
      showToast('Note fields populated from image', 'success');
      appliedImageData.current = true; // Mark as applied to prevent duplicate processing
    } catch (error) {
      console.error('Image import error:', error);
      showToast(error.message || 'Failed to import from image', 'error');
    } finally {
      setIsImportingImage(false);
    }
  }, [showToast, setNote, setHasChanges]);

  // Handle image data passed from image upload modal
  useEffect(() => {
    // Check if noteData is passed
    const data = location.state?.noteData;
    if (data && isCreate && !appliedImageData.current) {
      // Update note with returned fields (similar to handleImportImage)
      setNote(prev => ({
        ...prev,
        title: data.title || prev.title,
        description: data.description || prev.description,
        content: data.content || prev.content,
      }));
      
      setHasChanges(true);
      appliedImageData.current = true;
      
      // Clear location state to avoid re-trigger
      navigate(location.pathname, { replace: true, state: {} });
    }
    
    // Check if raw image file is passed from ImageUploadModal
    const imageFile = location.state?.imageFile;
    if (imageFile && isCreate && !appliedImageData.current) {
      // Process the image using the same function as the camera button
      handleImportImage(imageFile);
      
      // Clear location state to avoid re-trigger
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, isCreate, navigate, handleImportImage]);
  
  // Load draft from localStorage when creating a new note
  useEffect(() => {
    if (isCreate) {
      const draftNote = localStorage.getItem('note_draft');
      if (draftNote) {
        try {
          const parsedDraft = JSON.parse(draftNote);
          setNote(parsedDraft);
        } catch (error) {
          console.error('Failed to parse draft note:', error);
        }
      }
    }
  }, [isCreate]);

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
      // Use state as is - we've already loaded from draft if available
    }
  }, [noteId, notes, isNotesLoading, navigate, showToast, isCreate]);

  // Save draft to localStorage when note changes
  useEffect(() => {
    if (isCreate) {
      localStorage.setItem('note_draft', JSON.stringify(note));
    }
  }, [note, isCreate]);

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
    } else if (isCreate) {
      // For new notes, check if there's any content to save
      const hasContent = 
        note.title.trim() !== '' || 
        note.description.trim() !== '' || 
        note.content.trim() !== '';
      setHasChanges(hasContent);
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
    // Validate note has content before saving
    if (!note.title.trim() && !note.description.trim() && !note.content.trim()) {
      showToast('Cannot save an empty note. Please add some content.', 'error');
      return;
    }

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
        // Clear draft after successful save
        localStorage.removeItem('note_draft');
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
        onImportImage={handleImportImage}
        isImportingImage={isImportingImage}
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