import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { NoteCard } from './noteCard';
import { Button } from '../ui/button';
import { ChevronRight, ChevronDown, ChevronRight as ChevronRightIcon } from 'lucide-react';

export const NotesSection = React.memo(
    ({ title, notes = [], sectionKey, refreshNotes, isExpanded, toggleExpanded }) => {
        const navigate = useNavigate();
        const uniqueNotes = useMemo(
            () => Array.from(new Map(notes.map(note => [note.id, note])).values()),
            [notes]
        );
        const visibleNotes = isExpanded ? uniqueNotes.slice(0, 3) : [];
        const hasMore = uniqueNotes.length > 3;

        const handleSeeMore = () => {
            navigate(`/section/${sectionKey}`, { state: { notes: uniqueNotes, title } });
        };

        if (!uniqueNotes.length) return null;

        return (
            <section className="space-y-2">
                <div
                    className="flex justify-between items-center cursor-pointer"
                    onClick={toggleExpanded}
                >
                    <div className="flex items-baseline gap-2">
                        <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
                        <span className="text-sm text-text-primary/60">{uniqueNotes.length} notes</span>
                    </div>
                    {isExpanded ? (
                        <ChevronDown className="h-5 w-5 text-text-primary/60" />
                    ) : (
                        <ChevronRightIcon className="h-5 w-5 text-text-primary/60" />
                    )}
                </div>
                {isExpanded && (
                    <div className="space-y-2">
                        {visibleNotes.map(note => (
                            <NoteCard key={note.id} note={note} refreshNotes={refreshNotes} />
                        ))}
                        {hasMore && (
                            <Button
                                variant="ghost"
                                size="sm"
                                className="text-sm font-medium hover:bg-overlay/10"
                                onClick={handleSeeMore}
                                aria-label={`See more notes in ${title} section`}
                            >
                                See More ({uniqueNotes.length - 3} more) <ChevronRight className="ml-1 h-4 w-4" />
                            </Button>
                        )}
                    </div>
                )}
            </section>
        );
    },
    (prevProps, nextProps) => {
        return (
            prevProps.title === nextProps.title &&
            prevProps.sectionKey === nextProps.sectionKey &&
            prevProps.refreshNotes === nextProps.refreshNotes &&
            prevProps.notes === nextProps.notes &&
            prevProps.isExpanded === nextProps.isExpanded
        );
    }
);