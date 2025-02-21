import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useNotes } from '../../../hooks/useNotes';
import { Button } from '../../../components/ui/button';
import { ArrowLeft, Pencil } from 'lucide-react';
import { Badge } from '../../../components/ui/badge';

export default function ViewNote() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { notes } = useNotes();
    const [note, setNote] = useState(null);

    useEffect(() => {
        const currentNote = notes.find(n => n.id === id);
        if (currentNote) {
            setNote(currentNote);
        }
    }, [id, notes]);

    if (!note) return null;

    return (
        <div className="min-h-screen bg-bg-primary">
            <header className="border-b border-overlay/10">
                <div className="max-w-[1920px] mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => navigate('/')}
                            className="text-text-primary/60 hover:text-text-primary"
                        >
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                        <h1 className="text-xl font-semibold">{note.title}</h1>
                    </div>
                    <Button
                        variant="outline"
                        onClick={() => navigate(`/note/edit/${id}`)}
                        className="flex items-center gap-2"
                    >
                        <Pencil className="h-4 w-4" />
                        Edit
                    </Button>
                </div>
            </header>

            <main className="max-w-[1920px] mx-auto px-4 py-8 space-y-8">
                <div className="space-y-4">
                    {note.description && (
                        <p className="text-text-primary/80">{note.description}</p>
                    )}
                    {note.tags?.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                            {note.tags.map((tag, index) => (
                                <Badge key={index} variant="secondary">
                                    {tag.name}
                                </Badge>
                            ))}
                        </div>
                    )}
                </div>

                <div className="whitespace-pre-wrap text-text-primary">
                    {note.content}
                </div>
            </main>
        </div>
    );
}