import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react'; 
import { useNavigate } from 'react-router-dom';
import debounce from 'lodash/debounce'; 
import { NoteCard } from './noteCard';
import { Button } from '../ui/button';
import { ChevronRight } from 'lucide-react';

export const NotesSection = React.memo(
  ({ title, notes = [], sectionKey, refreshNotes }) => {
    const scrollContainerRef = useRef(null);
    const [gradients, setGradients] = useState({ left: false, right: false });
    const navigate = useNavigate();

    const uniqueNotes = useMemo(
      () => Array.from(new Map(notes.map(note => [note.id, note])).values()),
      [notes]
    );

    const handleScroll = useCallback(
      debounce(() => {
        const container = scrollContainerRef.current;
        if (container) {
          const { scrollLeft, clientWidth, scrollWidth } = container;
          setGradients({
            left: scrollLeft > 0,
            right: scrollLeft + clientWidth < scrollWidth,
          });
        }
      }, 100),
      []
    );

    useEffect(() => {
      const container = scrollContainerRef.current;
      if (container) {
        handleScroll();
        container.addEventListener('scroll', handleScroll);
        return () => container.removeEventListener('scroll', handleScroll);
      }
    }, [handleScroll]);

    const handleSeeMore = () => {
      navigate(`/section/${sectionKey}`, { state: { notes: uniqueNotes, title } });
    };

    if (!uniqueNotes.length) return null;

    return (
      <section className="space-y-2 overflow-hidden">
        <div className="flex justify-between items-center">
          <div className="flex items-baseline gap-2">
            <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
            <span className="text-sm text-text-primary/60">{uniqueNotes.length} notes</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-sm font-medium hover:bg-overlay/10"
            onClick={handleSeeMore}
            aria-label={`See more notes in ${title} section`}
          >
            See More <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
        <div className="relative">
          <div
            ref={scrollContainerRef}
            className="flex gap-4 overflow-x-auto overflow-y-hidden overscroll-x-contain pb-4 snap-x scrollbar-hide"
          >
            {uniqueNotes.map(note => (
              <div key={note.id} className="flex-none w-[280px] snap-start">
                <NoteCard note={note} refreshNotes={refreshNotes} />
              </div>
            ))}
          </div>
          {gradients.left && (
            <div className="absolute left-0 top-0 w-24 h-full bg-gradient-to-r from-bg-primary via-bg-primary/80 to-transparent pointer-events-none" />
          )}
          {gradients.right && (
            <div className="absolute right-0 top-0 w-24 h-full bg-gradient-to-l from-bg-primary via-bg-primary/80 to-transparent pointer-events-none" />
          )}
        </div>
      </section>
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.title === nextProps.title &&
      prevProps.sectionKey === nextProps.sectionKey &&
      prevProps.refreshNotes === nextProps.refreshNotes &&
      prevProps.notes === nextProps.notes 
    );
  }
);