import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { MoreHorizontal } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator
} from '../ui/dropdown-menu';
import { useNotes } from '../../hooks/useNotes';
import { useToast } from '../../contexts/ToastContext';

export const NoteCard = ({ note, refreshNotes }) => {
    const [showFulldescription, setShowFulldescription] = useState(false);
    const navigate = useNavigate();
    const { deleteNote, tags } = useNotes();
    const showToast = useToast();
    const [isLoadingDelete, setIsLoadingDelete] = useState(false);

    if (!note) return null;

    const title = note.title || 'Untitled Note';
    const description = note.description || '';
    const MAX_DESCRIPTION_LENGTH = 100;
    const truncatedDescription = description.length > MAX_DESCRIPTION_LENGTH
        ? description.substring(0, MAX_DESCRIPTION_LENGTH) + '...'
        : description;

    const formattedTime = note.createdAt 
        ? new Date(note.createdAt).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        }).toLowerCase().replace(/ /g, '')
        : '';

    const handleMoreClick = (e) => {
        e.stopPropagation();
        setShowFulldescription(true);
    };

    const handleDelete = async (e) => {
        e.stopPropagation();
        setIsLoadingDelete(true);
        try {
            await deleteNote(note.id);
            refreshNotes();
        } catch (error) {
            setIsLoadingDelete(false);
            showToast('Failed to delete note', 'error');
        }
    };

    return (
        <Card
            className={`p-3 bg-overlay/5 border-overlay/10 transition-colors group ${
                isLoadingDelete 
                    ? 'opacity-50 pointer-events-none' 
                    : 'hover:bg-overlay/10 cursor-pointer'
            }`}
            onClick={!isLoadingDelete ? () => navigate(`/note/view/${note.id}`) : undefined}
        >
            <div className="space-y-1">
                <div className="flex items-start justify-between gap-1">
                    <h3 className="font-medium leading-tight text-sm">{title}</h3>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="ghost"
                                className="h-6 w-6 p-0 text-text-primary/60 hover:text-text-primary"
                                onClick={(e) => e.stopPropagation()}
                                disabled={isLoadingDelete}
                            >
                                <MoreHorizontal className="h-3 w-3" />
                                <span className="sr-only">Open menu</span>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent 
                            align="end" 
                            className="w-fit sm:w-48 bg-bg-primary border border-overlay/10 shadow-lg"
                        >
                            <DropdownMenuItem 
                                className="flex items-center gap-1 text-text-primary hover:bg-overlay/10 cursor-pointer text-sm py-1"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(`/note/edit/${note.id}`);
                                }}
                            >
                                <span>Edit</span>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-overlay/10" />
                            <DropdownMenuItem 
                                className="flex items-center gap-1 text-red-500 hover:bg-overlay/10 cursor-pointer text-sm py-1"
                                onClick={handleDelete}
                                disabled={isLoadingDelete}
                            >
                                <span>{isLoadingDelete ? 'Deleting...' : 'Delete'}</span>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
                <div className="text-xs text-text-primary/60 leading-tight overflow-x-hidden">
                    {truncatedDescription}
                </div>
            </div>
            {(note.tags && note.tags.length > 0) && (
                <>
                    <hr className="mt-1 border-t border-overlay/10" />
                    <footer className="flex items-center gap-1 pt-1">
                        <span className="text-xs text-text-primary/60">
                            {formattedTime}
                        </span>
                        <span className="text-xs text-text-primary/60">|</span>
                        {note.tags.map((tagId, index) => {
                            const tag = tags.find(t => t.id === tagId);
                            return tag ? (
                                <span
                                    key={`${note.id}-tag-${tagId}-${index}`}
                                    className={`inline-flex items-center px-1 py-0.5 rounded text-xs ${tag.color || 'bg-gray-500/20 text-gray-500'}`}
                                >
                                    {tag.name}
                                </span>
                            ) : null;
                        })}
                    </footer>
                </>
            )}
        </Card>
    );
};

export const renderNoteCard = (note) => <NoteCard note={note} />;