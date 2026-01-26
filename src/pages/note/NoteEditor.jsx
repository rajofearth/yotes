import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useNotes } from '../../hooks/useNotes';
import { useToast } from '../../contexts/ToastContext';
import { NoteForm } from '../../components/note/NoteForm';
import { NoteEditorHeader } from '../../components/note/NoteEditorHeader';
import { TagManagementDialog } from '../../components/settings/TagManagementDialog';
import { Loader2 } from 'lucide-react';
import { generateNoteFromImage } from '../../utils/aiImageService';
import { Skeleton } from '../../components/ui/skeleton';
import { getFromDB, setInDB } from '../../utils/indexedDB';
import { encryptString, decryptString } from '../../lib/e2ee';
import { useConvexAuth } from 'convex/react';

export default function NoteEditor() {
  const { id: noteId } = useParams(); // Get note ID from params (if editing)
  const navigate = useNavigate();
  const location = useLocation();
  const { createNote, updateNote, notes, tags, createTag, isLoading: isNotesLoading, allTags, convexUserId, isE2EEReady } = useNotes();
  const showToast = useToast();
  const { isAuthenticated } = useConvexAuth();

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
  const imageInFlightRef = useRef(false);
  const draftKey = useMemo(() => (convexUserId ? `note_draft_${convexUserId}` : 'note_draft'), [convexUserId]);
  const initialNoteLoadedRef = useRef(false);
  
  // Handle importing note fields from an image (moved up and using useCallback)
  const handleImportImage = useCallback(async (file) => {
    if (imageInFlightRef.current) return;
    imageInFlightRef.current = true;
    setIsImportingImage(true);
    try {
      if (!isAuthenticated) {
        throw new Error('Not authenticated');
      }
      const fields = await generateNoteFromImage(file, convexUserId, isAuthenticated);
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
      imageInFlightRef.current = false;
      setIsImportingImage(false);
    }
  }, [showToast, setNote, setHasChanges, convexUserId, isAuthenticated]);

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
  
  // Load draft from IndexedDB (encrypted) when creating a new note (per-user)
  useEffect(() => {
    if (!isCreate || !isE2EEReady) return;
    (async () => {
      try {
        const enc = await getFromDB('sessions', draftKey);
        if (enc?.ct && enc?.iv && window.__yotesDek) {
          const json = await decryptString(window.__yotesDek, enc);
          const parsed = JSON.parse(json);
          setNote(parsed);
        }
      } catch (e) {
        // ignore corrupt drafts
      }
    })();
  }, [isCreate, draftKey, isE2EEReady]);

  useEffect(() => {
    if (noteId && !isNotesLoading) { // Wait for notes to load
      const existingNote = notes.find(n => n.id === noteId);
      if (!existingNote) {
        showToast('Note not found', 'error');
        navigate('/', { replace: true });
        return;
      }

      const serverUpdatedAt = new Date(existingNote.updatedAt || existingNote.createdAt);

      // First hydration from server
      if (!initialNoteLoadedRef.current) {
        setNote(existingNote);
        setLastSaved(serverUpdatedAt);
        initialNoteLoadedRef.current = true;
        return;
      }

      // Subsequent updates: only pull from server if not dirty and newer on server
      if (!hasChanges && (!lastSaved || serverUpdatedAt > lastSaved)) {
        setNote(existingNote);
        setLastSaved(serverUpdatedAt);
      }
    }
    // For create mode, we've already loaded from draft if available
  }, [noteId, notes, isNotesLoading, navigate, showToast, isCreate, hasChanges, lastSaved]);

  // Debounced autosave draft to IndexedDB (encrypted) when note changes (per-user)
  useEffect(() => {
    if (!isCreate || !isE2EEReady || !window.__yotesDek) return;
    const timer = setTimeout(() => {
      try {
        const json = JSON.stringify(note);
        encryptString(window.__yotesDek, json).then((enc) => {
          setInDB('sessions', draftKey, enc);
        }).catch(() => {});
      } catch (e) {
        // Ignore storage errors
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [note, isCreate, draftKey, isE2EEReady]);

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
        // Clear encrypted draft after successful save
        try { await setInDB('sessions', draftKey, null); } catch {}
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

  // SKELETON: Show while importing from image
  if (isImportingImage) {
    return (
      <div className="min-h-screen bg-bg-primary flex flex-col">
        {/* Header skeleton */}
        <header className="border-b border-overlay/10 bg-bg-primary/95 backdrop-blur-sm sticky top-0 z-10 shadow-sm">
          <div className="max-w-[1400px] mx-auto px-3 sm:px-6 py-3 sm:py-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-8">
              {/* Left section: Back button and title */}
              <div className="flex items-start gap-2 w-full sm:max-w-[70%]">
                <Skeleton className="h-9 w-9 rounded-md" />
                <Skeleton className="h-10 w-full" />
              </div>
              {/* Right section: action buttons */}
              <div className="flex items-center gap-2 mt-3 sm:mt-0">
                <Skeleton className="h-8 w-8 rounded-md" />
                <Skeleton className="h-8 w-16 rounded-md" />
                <Skeleton className="h-8 w-20 rounded-md" />
              </div>
            </div>
          </div>
        </header>
        {/* Main skeleton */}
        <main className="flex-1 max-w-[1920px] mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 sm:space-y-8 w-full">
          <div className="space-y-4 max-w-4xl mx-auto">
            {/* Description skeleton with floating label */}
            <div className="relative">
              <Skeleton className="h-[60px] w-full mb-1" />
              <div className="absolute right-3 top-3 text-xs text-text-primary/30 pointer-events-none">
                <Skeleton className="h-4 w-20" />
              </div>
            </div>
            {/* Tag pills skeleton */}
            <div className="flex gap-2 mb-2">
              <Skeleton className="h-6 w-16 rounded-full" />
              <Skeleton className="h-6 w-12 rounded-full" />
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
            {/* Content skeleton in bordered container with floating char count */}
            <div className="relative max-w-4xl mx-auto border border-overlay/10 rounded-md shadow-sm">
              <div className="space-y-2 p-5 sm:p-6">
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-5 w-11/12" />
                <Skeleton className="h-5 w-10/12" />
                <Skeleton className="h-5 w-9/12" />
                <Skeleton className="h-5 w-8/12" />
                <Skeleton className="h-5 w-7/12" />
              </div>
              <div className="absolute right-3 bottom-3">
                <Skeleton className="h-6 w-20 rounded-md" />
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

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