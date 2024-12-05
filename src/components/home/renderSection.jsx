import { Button } from '../ui/button';
import { ChevronRight } from 'lucide-react';
import { renderNoteCard } from './noteRender';
import { useRef, useState } from 'react';

// Create a proper React component
const NotesSection = ({ title, notes, sectionKey }) => {
    const scrollContainerRef = useRef(null);
    const [isScrolling, setIsScrolling] = useState(false);
    const [startX, setStartX] = useState(0);
    const [scrollLeft, setScrollLeft] = useState(0);

    const handleMouseDown = (e) => {
        setIsScrolling(true);
        setStartX(e.pageX - scrollContainerRef.current.offsetLeft);
        setScrollLeft(scrollContainerRef.current.scrollLeft);
    };

    const handleMouseMove = (e) => {
        if (!isScrolling) return;
        e.preventDefault();
        const x = e.pageX - scrollContainerRef.current.offsetLeft;
        const walk = (x - startX) * 2;
        scrollContainerRef.current.scrollLeft = scrollLeft - walk;
    };

    const handleMouseUp = () => {
        setIsScrolling(false);
    };

    return (
        <section className="space-y-4">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
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
                    className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x snap-mandatory cursor-grab active:cursor-grabbing"
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                >
                    {notes?.slice(0, 4).map(note => (
                        <div key={note.id} className="snap-start">
                            {renderNoteCard(note)}
                        </div>
                    ))}
                </div>
                <div className="absolute right-0 top-0 w-20 h-full bg-gradient-to-l from-bg-primary to-transparent pointer-events-none" />
            </div>
        </section>
    );
};

// Export both the component and the render function
export { NotesSection };
export const renderSection = (title, notes, key) => {
    return <NotesSection key={key} sectionKey={key} title={title} notes={notes} />;
};