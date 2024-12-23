import { useRef, useState, useEffect } from 'react';
import { NoteCard } from './noteRender';
import { Button } from '../ui/button';
import { ChevronRight } from 'lucide-react';

export const NotesSection = ({ title, notes = [], sectionKey, refreshNotes }) => {
    const scrollContainerRef = useRef(null);
    const [showGradient, setShowGradient] = useState(false);

    if (!notes || notes.length === 0) {
        return null;
    }

    const handleScroll = () => {
        const container = scrollContainerRef.current;
        setShowGradient(container.scrollLeft + container.clientWidth < container.scrollWidth);
    };

    useEffect(() => {
        const container = scrollContainerRef.current;
        if (container) {
            setShowGradient(container.scrollWidth > container.clientWidth);
            container.addEventListener('scroll', handleScroll);
        }

        return () => {
            if (container) {
                container.removeEventListener('scroll', handleScroll);
            }
        };
    }, [notes]);

    return (
        <section className="space-y-4 overflow-hidden">
            <div className="flex justify-between items-center">
                <div className="flex items-baseline gap-2">
                    <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
                    <span className="text-sm text-text-primary/60">
                        {notes.length} notes
                    </span>
                </div>
                <Button 
                    variant="ghost" 
                    size="sm"
                    className="text-sm font-medium hover:bg-overlay/5"
                >
                    See More <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
            </div>
            <div className="relative">
                <div 
                    ref={scrollContainerRef}
                    className="flex gap-4 overflow-x-auto overflow-y-hidden overscroll-x-contain pb-4 snap-x scrollbar-hide"
                >
                    {notes.map(note => (
                        <div 
                            key={note.id} 
                            className="flex-none w-[300px] snap-start"
                        >
                            <NoteCard note={note} refreshNotes={refreshNotes} />
                        </div>
                    ))}
                </div>
                {showGradient && (
                    <div className="absolute right-0 top-0 w-20 h-full bg-gradient-to-l from-bg-primary to-transparent pointer-events-none" />
                )}
            </div>
        </section>
    );
};

export const renderSection = (title, notes, key) => {
    return <NotesSection key={key} sectionKey={key} title={title} notes={notes} />;
};