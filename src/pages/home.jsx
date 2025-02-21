import { useState, useEffect, useCallback } from 'react';
import { groupNotesByDate } from '../components/home/grpNotesByDate';
import { NotesSection } from '../components/home/renderSection';
import { TagFilters } from '../components/home/TagFilters';
import NavBar from '../components/home/navBar';
import { useNotes } from '../hooks/useNotes';
import { useGoogleDrive } from '../contexts/GoogleDriveContext';
import { useLocation } from 'react-router-dom';

// Simple debounce function
const debounce = (func, delay) => {
    let timeoutId;
    return (...args) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func(...args), delay);
    };
};

export default function Home() {
    const { isLoading: isDriveLoading } = useGoogleDrive();
    const location = useLocation();
    const { notes, tags, isLoading: isNotesLoading, error, refreshData } = useNotes();
    const [filteredNotes, setFilteredNotes] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedTagIds, setSelectedTagIds] = useState(['all']);

    // Centralized filtering logic
    const applyFiltersAndSearch = useCallback((notesList, query, tagIds) => {
        //console.log('Applying filters - Notes:', notesList.length, 'Query:', query, 'Tag IDs:', tagIds);
        let filtered = [...notesList];

        // Apply tag filter
        if (!tagIds.includes('all') && tagIds.length > 0) {
            filtered = filtered.filter(note =>
                note.tags?.some(tagId => tagIds.includes(tagId))
            );
        }

        // Apply search filter
        if (query) {
            const lowerQuery = query.toLowerCase();
            filtered = filtered.filter(note =>
                (note.title?.toLowerCase().includes(lowerQuery) ||
                 note.description?.toLowerCase().includes(lowerQuery) ||
                 note.content?.toLowerCase().includes(lowerQuery))
            );
        }

        //console.log('Filtered notes result:', filtered.length);
        setFilteredNotes(filtered);
    }, []);

    // Initialize and handle refresh
    useEffect(() => {
        //console.log('useEffect - Notes:', notes.length, 'Query:', searchQuery, 'Tags:', selectedTagIds);
        if (location.state?.refresh) {
            //console.log('Refreshing data due to location state');
            refreshData();
        }
        applyFiltersAndSearch(notes, searchQuery, selectedTagIds);
    }, [notes, searchQuery, selectedTagIds, applyFiltersAndSearch, location.state?.refresh, refreshData]);

    // Debounced search handler
    const handleSearch = useCallback(
        debounce((query) => {
            //console.log('handleSearch triggered - Query:', query);
            setSearchQuery(query);
        }, 300),
        []
    );

    // Handle tag filtering
    const handleFilterChange = (tagIds) => {
        //console.log('handleFilterChange - Selected tag IDs:', tagIds);
        // Default to 'all' if no tags are selected
        const finalTagIds = tagIds.length === 0 ? ['all'] : tagIds;
        setSelectedTagIds(finalTagIds);
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
                {filteredNotes.length === 0 ? (
                    <div className="text-center text-text-primary/60 py-8">
                        No notes found matching your search or filter.
                    </div>
                ) : (
                    <>
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
                    </>
                )}
            </main>
        </div>
    );
}