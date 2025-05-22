import React, { useEffect, useRef } from 'react'
import { Button } from '../../components/ui/button';
import { ArrowLeft, Clock, Loader2, Save, Camera } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../../components/ui/tooltip';
import { Input } from '../../components/ui/input';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { Textarea } from '../../components/ui/textarea';

export const NoteEditorHeader = ({ note, onNoteChange, isSaving, hasChanges, lastSaved, onSave, titleInputRef, onImportImage, isImportingImage }) => {
    const navigate = useNavigate();
    const textAreaRef = useRef(null);
    const inputRef = useRef(null);

    const handleFileChange = (e) => {
        const file = e.target.files?.[0];
        if (file && onImportImage) {
            onImportImage(file);
        }
        e.target.value = '';
    };

    // Auto-resize the textarea based on content
    const adjustTextareaHeight = () => {
        if (textAreaRef.current) {
            textAreaRef.current.style.height = 'auto';
            textAreaRef.current.style.height = `${textAreaRef.current.scrollHeight}px`;
        }
    };

    // Adjust height on mount and when title changes
    useEffect(() => {
        adjustTextareaHeight();
    }, [note.title]);

    // Also adjust height on window resize for better mobile experience
    useEffect(() => {
        window.addEventListener('resize', adjustTextareaHeight);
        return () => {
            window.removeEventListener('resize', adjustTextareaHeight);
        };
    }, []);

    return (
        <header className="border-b border-overlay/10 bg-bg-primary/95 backdrop-blur-sm sticky top-0 z-10 shadow-sm">
            <div className="max-w-[1400px] mx-auto px-3 sm:px-6 py-3 sm:py-5">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-8">
                    {/* Left section: Back button and title */}
                    <div className="flex items-start gap-2 w-full sm:max-w-[70%]">
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => navigate('/')}
                                        className="text-text-primary/60 hover:text-text-primary hover:bg-overlay/10 transition-colors shrink-0 mt-1"
                                    >
                                        <ArrowLeft className="h-5 w-5" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>Back to notes (Escape)</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                        
                        <Textarea
                            ref={(el) => {
                                textAreaRef.current = el;
                                if (titleInputRef) {
                                    titleInputRef.current = el;
                                }
                            }}
                            placeholder="Note title"
                            className="text-xl sm:text-2xl font-semibold leading-tight bg-transparent border-none focus-visible:ring-1 focus-visible:ring-primary/40 p-0 px-1 resize-none overflow-hidden min-h-[2.5rem] placeholder:text-text-primary/40 transition-all w-full"
                            value={note.title || ''}
                            onChange={(e) => {
                                onNoteChange({ ...note, title: e.target.value });
                                adjustTextareaHeight();
                            }}
                            rows={1}
                            onFocus={adjustTextareaHeight}
                        />
                    </div>
                    
                    {/* Right section: Last saved info and buttons */}
                    <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
                        <div className="flex items-center text-text-primary/50 text-xs sm:mr-2">
                            {lastSaved && (
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger className="flex items-center gap-1 hover:text-text-primary/70 transition-colors">
                                            <Clock className="h-3 w-3" />
                                            <span className="whitespace-nowrap">{formatDistanceToNow(lastSaved, { addSuffix: true })}</span>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p>Last saved: {lastSaved.toLocaleString()}</p>
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            {/* Hidden file input for image import */}
                            <input
                                ref={inputRef}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={handleFileChange}
                            />
                            {/* Button to trigger image import */}
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => inputRef.current && inputRef.current.click()}
                                            disabled={isImportingImage}
                                        >
                                            <Camera className="h-4 w-4" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>Import note from image</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
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
                                            onClick={() => onSave()}
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
            </div>
        </header>
    )
}