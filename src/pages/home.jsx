import { useState, useEffect } from 'react';
import { groupNotesByDate } from '../components/home/grpNotesByDate';
import { NotesSection } from '../components/home/renderSection';
import { TagFilters } from '../components/home/TagFilters';
import NavBar from '../components/home/navBar';
import { useNotes } from '../hooks/useNotes';
import { useGoogleDrive } from '../contexts/GoogleDriveContext';
import { useLocation } from 'react-router-dom';

export default function Home() {
    const { isLoading: isDriveLoading } = useGoogleDrive();
    const location = useLocation();
    const { notes, tags, isLoading: isNotesLoading, error, refreshData } = useNotes();
    const [filteredNotes, setFilteredNotes] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        if (location.state?.refresh) refreshData();
        setFilteredNotes(notes);
    }, [location.state?.refresh, notes, refreshData]);

    const handleFilterChange = (selectedTagIds) => {
        let filtered;
        if (selectedTagIds.includes('all') || selectedTagIds.length === 0) {
            filtered = notes.filter(note =>
                searchQuery ? (
                    note.title?.toLowerCase().includes(searchQuery) ||
                    note.description?.toLowerCase().includes(searchQuery) ||
                    note.content?.toLowerCase().includes(searchQuery)
                ) : true
            );
        } else {
            filtered = notes.filter(note =>
                note.tags?.some(tagId => selectedTagIds.includes(tagId)) &&
                (searchQuery ? (
                    note.title?.toLowerCase().includes(searchQuery) ||
                    note.description?.toLowerCase().includes(searchQuery) ||
                    note.content?.toLowerCase().includes(searchQuery)
                ) : true)
            );
        }
        setFilteredNotes(filtered);
    };

    const handleSearch = (query) => {
        const lowerQuery = query.toLowerCase();
        setSearchQuery(lowerQuery);
        const filtered = notes.filter(note =>
            (note.title?.toLowerCase().includes(lowerQuery) ||
             note.description?.toLowerCase().includes(lowerQuery) ||
             note.content?.toLowerCase().includes(lowerQuery))
        );
        setFilteredNotes(filtered);
    };

    const groupedNotes = groupNotesByDate(filteredNotes || []);

    if (isDriveLoading || isNotesLoading) {
        return (
            <div className="min-h-screen bg-bg-primary flex items-center justify-center">
                <div className="text-text-primary">Loading your notes...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-bg-primary flex items-center justify-center">
                <div className="text-text-primary">Error loading notes: {error.message}</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-bg-primary">
            <NavBar onSearch={handleSearch} />
            <main className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6 pb-8 space-y-6 sm:space-y-8">
                <TagFilters tags={tags} onFilterChange={handleFilterChange} />
                {groupedNotes.Today?.length > 0 && (
                    <NotesSection key="today" sectionKey="today" title="Today" notes={groupedNotes.Today} refreshNotes={refreshData} />
                )}
                {groupedNotes.Yesterday?.length > 0 && (
                    <NotesSection key="yesterday" sectionKey="yesterday" title="Yesterday" notes={groupedNotes.Yesterday} refreshNotes={refreshData} />
                )}
                {Object.entries(groupedNotes.Earlier).map(([date, notes]) =>
                    notes.length > 0 && (
                        <NotesSection key={date} sectionKey={date} title={date} notes={notes} refreshNotes={refreshData} />
                    )
                )}
            </main>
        </div>
    );
}