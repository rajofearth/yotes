import { Button } from '../ui/button';
import { ChevronRight } from 'lucide-react';
import { renderNoteCard } from './noteRender';

const renderSection = (title, notes) => (
    <section key={title} className="space-y-4">
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
            <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x snap-mandatory">
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

export { renderSection };