import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useNotes } from '../../../hooks/useNotes';
import { Button } from '../../../components/ui/button';
import { ArrowLeft, Pencil } from 'lucide-react';
import { TagList } from '../../../components/tags/TagList';

export default function ViewNote() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { notes, tags } = useNotes();
    const [note, setNote] = useState(null);

    useEffect(() => {
        const currentNote = notes.find(n => n.id === id);
        if (currentNote) {
            setNote(currentNote);
        }
    }, [id, notes]);

    if (!notes.length) {
        return (
            <div className="min-h-screen bg-bg-primary flex items-center justify-center px-4">
                <p className="text-text-primary/60 text-center">Loading notes...</p>
            </div>
        );
    }

    if (!note) {
        return (
            <div className="min-h-screen bg-bg-primary flex items-center justify-center px-4">
                <p className="text-text-primary/60 text-center">Note not found.</p>
            </div>
        );
    }

    // Format creation date and time
    const createdAt = new Date(note.createdAt).toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
    });

    return (
        <div className="min-h-screen bg-bg-primary text-text-primary">
            <header className="border-b border-overlay/10 bg-bg-primary/95 sticky top-0 z-10">
                <div className="max-w-[1920px] mx-auto px-4 py-3 sm:py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4">
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => navigate('/')}
                            className="text-text-primary/60 hover:text-text-primary shrink-0"
                        >
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                        <div className="flex flex-col flex-1 min-w-0">
                            <h1 className="text-xl sm:text-2xl font-semibold leading-tight line-clamp-2">{note.title}</h1>
                            <div className="flex items-center justify-between gap-2 mt-1 sm:mt-1 sm:justify-start">
                                <span className="text-xs sm:text-sm text-text-primary/60">{createdAt}</span>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => navigate(`/note/edit/${id}`)}
                                    className="flex items-center gap-1 bg-overlay/5 hover:bg-overlay/10 h-8 px-3 sm:hidden"
                                >
                                    <Pencil className="h-4 w-4" />
                                    <span className="text-xs">Edit</span>
                                </Button>
                            </div>
                        </div>
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/note/edit/${id}`)}
                        className="flex items-center gap-1 bg-overlay/5 hover:bg-overlay/10 h-8 px-3 hidden sm:flex w-full sm:w-auto"
                    >
                        <Pencil className="h-4 w-4" />
                        <span className="text-xs">Edit</span>
                    </Button>
                </div>
            </header>
            <main className="max-w-[1920px] mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-5 sm:space-y-6">
                <div className="space-y-4">
                    {note.description && (
                        <p className="text-sm sm:text-base text-text-primary/80 leading-relaxed">{note.description}</p>
                    )}
                      <TagList tagIds={note.tags} tags={tags}  />
                </div>
                <div className="bg-overlay/5 p-4 sm:p-6 rounded-lg border border-overlay/10 whitespace-pre-wrap text-sm sm:text-base leading-relaxed">
                    {note.content}
                </div>
            </main>
        </div>
    );
}