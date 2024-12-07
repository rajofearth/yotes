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
} from '../ui/dropdown-menu';
import { useNotes } from '../../hooks/useNotes';
import { useToast } from '../../contexts/ToastContext';

export const NoteCard = ({ note }) => {
    const [showFullContent, setShowFullContent] = useState(false);
    const navigate = useNavigate();
    const { deleteNote } = useNotes();
    const showToast = useToast();

    if (!note) return null;

    const title = note.title || 'Untitled Note';
    const content = note.content || '';

    const contentLines = content.split('\n').filter(line => line.trim());
    const firstLine = contentLines[0] || '';
    const hasMoreContent = contentLines.length > 1;

    const handleMoreClick = (e) => {
        e.stopPropagation(); // Prevent card click when clicking menu
        setShowFullContent(true);
    };

    const handleDelete = async (e) => {
        e.stopPropagation();
        try {
            await deleteNote(note.id);
        } catch (error) {
            showToast('Failed to delete note', 'error');
        }
    };

    return (
        <Card 
            className="p-4 bg-overlay/5 border-overlay/10 hover:bg-overlay/10 transition-colors group cursor-pointer"
            onClick={() => navigate(`/note/${note.id}`)}
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
                            className="w-48 bg-bg-primary border border-overlay/10 shadow-lg"
                        >
                            <DropdownMenuItem 
                                className="text-text-primary hover:bg-overlay/10 cursor-pointer"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(`/note/${note.id}`);
                                }}
                            >
                                Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                                className="text-red-500 hover:bg-overlay/10 cursor-pointer"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleDelete(e);
                                }}
                            >
                                Delete
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>

                <div className="text-sm text-text-primary/60">
                    {showFullContent ? (
                        <div className="whitespace-pre-wrap">{content}</div>
                    ) : (
                        <>
                            <div>{firstLine}</div>
                            {hasMoreContent && (
                                <Button
                                    variant="ghost"
                                    className="px-0 text-xs hover:text-text-primary"
                                    onClick={handleMoreClick}
                                >
                                    Show more
                                </Button>
                            )}
                        </>
                    )}
                </div>

                {note.tags && note.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                        {note.tags.map((tag, index) => (
                            <span
                                key={index}
                                className="inline-flex items-center px-2 py-1 rounded-md text-xs bg-overlay/10 text-text-primary/80"
                            >
                                {tag}
                            </span>
                        ))}
                    </div>
                )}
            </div>
        </Card>
    );
};

// Helper function to maintain backward compatibility
export const renderNoteCard = (note) => {
    return <NoteCard note={note} />;
};