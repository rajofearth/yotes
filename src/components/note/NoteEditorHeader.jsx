import React from 'react'
import { Button } from '../../components/ui/button';
import { ArrowLeft, Clock, Loader2, Save } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../../components/ui/tooltip';
import { Input } from '../../components/ui/input';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';

export const NoteEditorHeader = ({ note, onNoteChange, isSaving, hasChanges, lastSaved, onSave, titleInputRef }) => {
    const navigate = useNavigate();
    return (
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
                        onChange={(e) => onNoteChange({ ...note, title: e.target.value })}
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
        </header>
    )
}