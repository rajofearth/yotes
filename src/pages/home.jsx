import { useState, useEffect } from 'react'
import { groupNotesByDate } from '../components/home/grpNotesByDate'
import { NotesSection } from '../components/home/renderSection'
import { TagFilters } from '../components/home/TagFilters'
import NavBar from '../components/home/navBar'
import { useNotes } from '../hooks/useNotes';
import { useGoogleDrive } from '../contexts/GoogleDriveContext';

export default function Home() {
    const { isLoading: isDriveLoading } = useGoogleDrive();
    const { 
        notes, 
        isLoading: isNotesLoading, 
        error,
        createNote,
        updateNote,
        deleteNote 
    } = useNotes();

    // Group notes only after they're loaded
    const groupedNotes = groupNotesByDate(notes || []);
    
    // Show loading state
    if (isDriveLoading || isNotesLoading) {
        return (
            <div className="min-h-screen bg-bg-primary flex items-center justify-center">
                <div className="text-text-primary">Loading your notes...</div>
            </div>
        );
    }

    // Show error state
    if (error) {
        return (
            <div className="min-h-screen bg-bg-primary flex items-center justify-center">
                <div className="text-text-primary">Error loading notes: {error.message}</div>
            </div>
        );
    }



    // Initial tags state - you might want to load this from Google Drive later
    const initialTags = [
        {
            id: 'getting-started',
            name: 'Getting Started',
            color: '#4f46e5'
        }
    ];

    return (
        <div className="min-h-screen bg-bg-primary">
            <NavBar />
            <main className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6 pb-8 space-y-6 sm:space-y-8">
                <TagFilters tags={initialTags} />
                {groupedNotes.Today?.length > 0 && (
                    <NotesSection key="today" sectionKey="today" title="Today" notes={groupedNotes.Today} />
                )}
                {groupedNotes.Yesterday?.length > 0 && (
                    <NotesSection key="yesterday" sectionKey="yesterday" title="Yesterday" notes={groupedNotes.Yesterday} />
                )}
                {Object.entries(groupedNotes.Earlier).map(([date, notes]) => 
                    notes.length > 0 && (
                        <NotesSection key={date} sectionKey={date} title={date} notes={notes} />
                    )
                )}
            </main>
        </div>
    );
}