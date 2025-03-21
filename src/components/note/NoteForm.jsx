// src/components/note/NoteForm.jsx
import React, { useRef, useEffect } from 'react';
import { Textarea } from '../../components/ui/textarea';
import { Input } from '../../components/ui/input';
import DOMPurify from 'dompurify';
import { TagSelector } from './TagSelector';

export const NoteForm = ({ note, onNoteChange, descriptionRef, contentRef, titleInputRef, tags, onTagToggle, onCreateTag }) => {

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
        onNoteChange({ ...note, [field]: value });
        setTimeout(() => handleTextareaResize(ref), 0);
    };

    useEffect(() => {
        if (descriptionRef.current && note?.description !== undefined) {
            handleTextareaResize(descriptionRef);
        }
        if (contentRef.current && note?.content !== undefined) {
            handleTextareaResize(contentRef);
        }
    }, [note?.description, note?.content, descriptionRef, contentRef]);


    return (
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
              <TagSelector
                note={note}
                tags={tags}
                onTagToggle={onTagToggle}
                onCreateTag={onCreateTag}
            />

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
        </div>
    );
};