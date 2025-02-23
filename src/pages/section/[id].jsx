import { useLocation, useNavigate } from 'react-router-dom';
import { NoteCard } from '../../components/home/noteCard';
import { Button } from '../../components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function SectionView() {
    const { state } = useLocation();
    const navigate = useNavigate();
    const { notes = [], title } = state || {};

    // Only redirect if state is invalid on initial render
    if (!state || !notes.length || !title) {
        navigate('/');
        return null;
    }

    return (
        <div className="min-h-screen bg-bg-primary">
            <header className="border-b border-overlay/10">
                <div className="max-w-[1920px] mx-auto px-4 py-4 flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div className="flex items-baseline gap-2">
                        <h1 className="text-xl font-semibold">{title}</h1>
                        <span className="text-xs text-text-primary/60">{notes.length} notes</span>
                    </div>
                </div>
            </header>
            <main className="max-w-[1920px] mx-auto px-4 py-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {notes.map(note => (
                    <NoteCard
                        key={note.id}
                        note={note}
                        refreshNotes={() => navigate('/', { state: { refresh: true } })}
                    />
                ))}
            </main>
        </div>
    );
}