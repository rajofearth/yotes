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

    if (!note) return null;

    const title = note.title || 'Untitled Note';
    const description = note.description || '';
    const MAX_DESCRIPTION_LENGTH = 100;
    const truncatedDescription = description.length > MAX_DESCRIPTION_LENGTH
        ? description.substring(0, MAX_DESCRIPTION_LENGTH) + '...'
        : description;

    const handleMoreClick = (e) => {
        e.stopPropagation();
        setShowFulldescription(true);
    };

    const handleDelete = async (e) => {
        e.stopPropagation();
        try {
            await deleteNote(note.id);
            refreshNotes();
        } catch (error) {
            showToast('Failed to delete note', 'error');
        }
    };

    return (
        <Card
            className="p-4 bg-overlay/5 border-overlay/10 hover:bg-overlay/10 transition-colors group cursor-pointer"
            onClick={() => navigate(`/note/view/${note.id}`)}
        >
            <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                    <h3 className="font-medium leading-none">{title}</h3>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="ghost"
                                className="h-8 w-8 p-0 text-text-primary/60 hover:text-text-primary"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <MoreHorizontal className="h-4 w-4" />
                                <span className="sr-only">Open menu</span>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent 
                            align="end" 
                            className="w-fit sm:w-48 bg-bg-primary border border-overlay/10 shadow-lg"
                        >
                            <DropdownMenuItem 
                                className="flex items-center gap-2 text-text-primary hover:bg-overlay/10 cursor-pointer"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(`/note/edit/${note.id}`);
                                }}
                            >
                                <span>Edit</span>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-overlay/10" />
                            <DropdownMenuItem 
                                className="flex items-center gap-2 text-red-500 hover:bg-overlay/10 cursor-pointer"
                                onClick={handleDelete}
                            >
                                <span>Delete</span>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
                <div className="text-sm text-text-primary/60">
                    {truncatedDescription}
                </div>
                {note.tags && note.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                        {note.tags.map((tagId, index) => {
                            const tag = tags.find(t => t.id === tagId);
                            return tag ? (
                                <span
                                    key={`${note.id}-tag-${tagId}-${index}`}
                                    className="inline-flex items-center px-2 py-1 rounded-md text-xs bg-overlay/10 text-text-primary/80"
                                >
                                    {tag.name}
                                </span>
                            ) : null;
                        })}
                    </div>
                )}
            </div>
        </Card>
    );
};

export const renderNoteCard = (note) => {
    return <NoteCard note={note} />;
};