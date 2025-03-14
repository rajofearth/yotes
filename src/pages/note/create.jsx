// src/pages/note/create.jsx
import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotes } from '../../hooks/useNotes';
import { useToast } from '../../contexts/ToastContext';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { ArrowLeft, Save, Clock, Tag, X, Plus, Loader2 } from 'lucide-react';
import { Badge } from '../../components/ui/badge';
import { Textarea } from '../../components/ui/textarea';
import { TagManagementDialog } from '../../components/settings/TagManagementDialog';
import { CreateTagDialog } from '../../components/settings/CreateTagDialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../../components/ui/tooltip';
import { Card, CardContent } from '../../components/ui/card';
import { formatDistanceToNow } from 'date-fns';
import DOMPurify from 'dompurify';

export default function CreateNote() {
    const navigate = useNavigate();
    const { createNote, tags, createTag } = useNotes();
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
    const [isTagSelectionOpen, setIsTagSelectionOpen] = useState(false);
    const [isCreateTagOpen, setIsCreateTagOpen] = useState(false);
    const [lastSaved, setLastSaved] = useState(null);
    const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
    const autoSaveTimerRef = useRef(null);
    const titleInputRef = useRef(null);
    const descriptionRef = useRef(null);
    const contentRef = useRef(null);

    // Tag state for CreateTagDialog
    const [tagState, setTagState] = useState({
        newName: '',
        newColor: 'bg-purple-600/20 text-purple-600',
    });

    // Focus title input on initial mount
    useEffect(() => {
        if (titleInputRef.current) {
            titleInputRef.current.focus();
        }
    }, []);

    // Check for changes
    useEffect(() => {
        const changesDetected =
            note.title !== '' ||
            note.description !== '' ||
            note.content !== '' ||
            note.tags.length > 0;

        setHasChanges(changesDetected);

        if (changesDetected && autoSaveEnabled && !lastSaved) {
            if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
            autoSaveTimerRef.current = setTimeout(() => {
                handleSave(true);
            }, 30000);
        }

        return () => {
            if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
        };
    }, [note, autoSaveEnabled, lastSaved]);

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

const handleSave = async (isAutoSave = false) => {
    if (!hasChanges) return;
    setIsSaving(true);
    try {
        const now = new Date();
        const createdNote = await createNote({
            ...note,
            createdAt: now.toISOString(),
            updatedAt: now.toISOString(),
        });
        setLastSaved(now);
        setHasChanges(false); // Reset after save
        if (!isAutoSave) {
            showToast('Note created successfully', 'success');
            navigate('/', { state: { resetFilters: true, refresh: true } });
        } else {
            showToast('Note auto-saved', 'info');
            setNote(prev => ({ ...prev, id: createdNote.id }));
        }
    } catch (error) {
        showToast('Failed to create note', 'error');
        console.error('Save error:', error);
    } finally {
        setIsSaving(false);
    }
};

    const removeTag = (tagId) => {
        setNote(prev => ({ ...prev, tags: prev.tags.filter(id => id !== tagId) }));
    };

    // Add handleTagToggle here
    const handleTagToggle = (tagId) => {
        setNote(prev => {
            const newTags = prev.tags.includes(tagId)
                ? prev.tags.filter(id => id !== tagId)
                : [...prev.tags, tagId];
            return { ...prev, tags: newTags };
        });
        setHasChanges(true);
    };

    const handleCreateTag = async (action, data) => {
        if (action === 'create' && data?.name) {
            try {
                const newTag = await createTag({ name: data.name, color: data.color || 'bg-gray-500/20 text-gray-500' });
                setNote(prev => ({ ...prev, tags: [...prev.tags, newTag.id] }));
                showToast(`Tag "${data.name}" created and added`, 'success');
                setTagState({ newName: '', newColor: 'bg-purple-600/20 text-purple-600' });
                setIsCreateTagOpen(false);
            } catch (error) {
                showToast(`Failed to create tag: ${error.message}`, 'error');
                console.error('Tag creation error:', error);
            }
        }
    };

    const handleTextareaResize = (ref) => {
        if (!ref.current) return;
        ref.current.style.height = 'auto';
        ref.current.style.height = `${ref.current.scrollHeight}px`;
    };

    const handleTextareaChange = (field, ref) => (e) => {
        const value = DOMPurify.sanitize(e.target.value, {
            ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a'],
            ALLOWED_ATTR: ['href'],
        });
        setNote(prev => ({ ...prev, [field]: value }));
        setTimeout(() => handleTextareaResize(ref), 0);
    };

    useEffect(() => {
        if (descriptionRef.current && note?.description !== undefined) {
            handleTextareaResize(descriptionRef);
        }
        if (contentRef.current && note?.content !== undefined) {
            handleTextareaResize(contentRef);
        }
    }, [note?.description, note?.content]);

    return (
        <div className="min-h-screen bg-bg-primary flex flex-col">
            <header className="border-b border-overlay/10 bg-bg-primary/95 sticky top-0 z-10 shadow-sm">
                <div className="max-w-[1920px] mx-auto px-4 py-3 sm:py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4">
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        onClick={() => navigate('/')} 
                                        className="text-text-primary/60 hover:text-text-primary hover:bg-overlay/10 transition-colors shrink-0"
                                    >
                                        <ArrowLeft className="h-5 w-5" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>Back to notes (Escape)</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                        
                        <Input
                            ref={titleInputRef}
                            type="text"
                            placeholder="Note title"
                            className="text-2xl font-semibold leading-tight bg-transparent border-none focus-visible:ring-1 focus-visible:ring-primary/40 p-0 h-auto placeholder:text-text-primary/40 line-clamp-2 transition-all"
                            value={note.title || ''}
                            onChange={(e) => setNote(prev => ({ ...prev, title: e.target.value }))}
                        />
                    </div>
                    
                    <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                        <div className="flex items-center text-text-primary/50 text-xs">
                            {lastSaved && (
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger className="flex items-center gap-1 hover:text-text-primary/70 transition-colors">
                                            <Clock className="h-3 w-3" />
                                            <span>{formatDistanceToNow(lastSaved, { addSuffix: true })}</span>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p>Last saved: {lastSaved.toLocaleString()}</p>
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            )}
                        </div>
                        
                        <div className="flex items-center gap-2">
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button 
                                            variant="ghost" 
                                            size="sm" 
                                            onClick={() => navigate('/')} 
                                            className="text-text-primary/70 hover:text-text-primary"
                                        >
                                            Cancel
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>Discard changes</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                            
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            onClick={() => handleSave()}
                                            disabled={!hasChanges || isSaving}
                                            size="sm"
                                            className={`flex items-center gap-2 ${!hasChanges || isSaving ? 'opacity-50' : 'bg-primary hover:bg-primary/90'} transition-all`}
                                        >
                                            {isSaving ? (
                                                <>
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                    Saving...
                                                </>
                                            ) : (
                                                <>
                                                    <Save className="h-4 w-4" />
                                                    Save
                                                </>
                                            )}
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>Save changes (Ctrl+S)</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        </div>
                    </div>
                </div>
            </header>
            
            <main className="flex-1 max-w-[1920px] mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 sm:space-y-8 w-full">
                <div className="space-y-4 max-w-4xl mx-auto">
                    <div className="relative">
                        <Textarea
                            ref={descriptionRef}
                            placeholder="Add a brief description (optional)"
                            className="w-full text-sm sm:text-base py-3 sm:py-3.5 bg-transparent border-overlay/10 min-h-[60px] overflow-hidden transition-colors focus:border-primary/30 placeholder:text-text-primary/30 rounded-md"
                            value={note.description || ''}
                            onChange={handleTextareaChange('description', descriptionRef)}
                            rows={1}
                        />
                        <div className="absolute right-3 top-3 text-xs text-text-primary/30 pointer-events-none">
                            Description
                        </div>
                    </div>
                    
                    <div className="space-y-2 bg-overlay/5 p-3 rounded-md border border-overlay/10">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1 text-text-primary/70">
                                <Tag className="h-3.5 w-3.5" />
                                <span className="text-xs font-medium">Tags</span>
                            </div>
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button 
                                            variant="ghost" 
                                            size="sm" 
                                            onClick={() => setIsTagSelectionOpen(true)}
                                            className="h-6 w-6 p-0"
                                        >
                                            <Plus className="h-3.5 w-3.5" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>Add or manage tags</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        </div>
                        
                        <div className="flex flex-wrap gap-1 min-h-[24px]">
                            {note.tags?.length > 0 ? (
                                note.tags.map(tagId => {
                                    const tag = tags.find(t => t.id === tagId);
                                    return tag ? (
                                        <Badge 
                                            key={tagId} 
                                            className={`${tag.color || 'bg-gray-500/20 text-gray-500'} flex items-center gap-0.5 px-1.5 py-0 text-xs hover:opacity-90 transition-opacity cursor-default`}
                                        >
                                            {tag.name}
                                            <button 
                                                onClick={() => removeTag(tagId)} 
                                                className="ml-0.5 hover:text-red-500 rounded-full hover:bg-white/10 transition-colors flex items-center justify-center h-3 w-3"
                                                aria-label={`Remove tag ${tag.name}`}
                                            >
                                                <X className="h-2.5 w-2.5" />
                                            </button>
                                        </Badge>
                                    ) : null;
                                })
                            ) : (
                                <div className="text-text-primary/30 text-xs py-0.5">No tags</div>
                            )}
                        </div>
                    </div>
                </div>
                
                <div className="relative max-w-4xl mx-auto border border-overlay/10 rounded-md shadow-sm">
                    <Textarea
                        ref={contentRef}
                        placeholder="Start writing your note..."
                        className="w-full bg-bg-primary dark:bg-black border-overlay/10 text-sm sm:text-base py-4 sm:py-5 px-5 sm:px-6 min-h-[300px] overflow-hidden focus:border-primary/30 rounded-md"
                        value={note.content || ''}
                        onChange={handleTextareaChange('content', contentRef)}
                        rows={1}
                    />
                    <div className="absolute right-3 bottom-3 flex items-center gap-2">
                        <div className="text-xs text-text-primary/30 bg-bg-primary/80 px-2 py-1 rounded-md">
                            {note.content ? note.content.length : 0} characters
                        </div>
                    </div>
                </div>
            </main>
            
            {/* Tag Selection Dialog */}
            <Dialog open={isTagSelectionOpen} onOpenChange={setIsTagSelectionOpen}>
                <DialogContent className="bg-bg-primary border-overlay/10 shadow-lg max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-semibold text-text-primary">Select Tags</DialogTitle>
                        <DialogDescription className="text-text-primary/60">
                            Choose tags to add to this note or create a new one.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-2 max-h-[50vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-text-primary/70">Available Tags</span>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setIsCreateTagOpen(true)}
                                className="h-6 w-6 p-0"
                            >
                                <Plus className="h-4 w-4" />
                            </Button>
                        </div>
                        {tags.length > 0 ? (
                            tags.map(tag => (
                                <label key={tag.id} className="flex items-center gap-2 py-1">
                                    <input
                                        type="checkbox"
                                        checked={note.tags.includes(tag.id)}
                                        onChange={() => handleTagToggle(tag.id)} // Now defined!
                                        className="h-4 w-4 text-primary focus:ring-primary/40"
                                    />
                                    <span className={`${tag.color?.split(' ').find(c => c.startsWith('text-')) || 'text-gray-500'} text-sm`}>
                                        {tag.name}
                                    </span>
                                </label>
                            ))
                        ) : (
                            <div className="text-text-primary/60 text-sm">No tags available. Create one!</div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {/* Create Tag Dialog */}
            <CreateTagDialog
                open={isCreateTagOpen}
                onOpenChange={setIsCreateTagOpen}
                tagState={tagState}
                setTagState={setTagState}
                handleTagAction={handleCreateTag}
            />

            {/* Tag Management Dialog */}
            <TagManagementDialog open={isTagManagementOpen} onOpenChange={setIsTagManagementOpen} />
        </div>
    );
}