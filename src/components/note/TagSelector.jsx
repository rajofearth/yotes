// src/components/note/TagSelector.jsx
import React, { useState } from 'react';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Plus, Tag, X } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '../../components/ui/dialog';
import { CreateTagDialog } from '../settings/CreateTagDialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../../components/ui/tooltip';

export const TagSelector = ({ note, tags, onTagToggle, onCreateTag, onTagManagementOpen }) => {
    const [isTagSelectionOpen, setIsTagSelectionOpen] = useState(false);
    const [isCreateTagOpen, setIsCreateTagOpen] = useState(false);
    // Tag state for CreateTagDialog
    const [tagState, setTagState] = useState({
        newName: '',
        newColor: 'bg-purple-600/20 text-purple-600',
    });

    const removeTag = (tagId) => {
        onTagToggle(tagId); // Reuse onTagToggle for removal
    };
    return (
        <>
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
                                    <Plus className="h-4 w-4" />
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
                                        onChange={() => onTagToggle(tag.id)} 
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
                handleTagAction={onCreateTag}
            />
        </>
    )
}