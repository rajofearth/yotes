import { useState, useEffect, useCallback, useMemo } from 'react';
import { groupNotesByDate } from '../components/home/grpNotesByDate';
import { NotesSection } from '../components/home/notesSection';
import { TagFilters } from '../components/home/TagFilters';
import NavBar from '../components/home/navBar';
import { useNotes } from '../hooks/useNotes';
import { useGoogleDrive } from '../contexts/GoogleDriveContext';
import { useLocation } from 'react-router-dom';
import { applyFiltersAndSearch, debounce } from '../utils/noteFilters';
import ProgressBar from '../components/ProgressBar';
import { ErrorState } from '../components/home/ErrorState';

export default function Home() {
    const { isLoading: isDriveLoading } = useGoogleDrive();
    const { notes, tags, isLoading: isNotesLoading, error, refreshData, loadingProgress } = useNotes();
    const location = useLocation();
    const [filteredNotes, setFilteredNotes] = useState(notes);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedTagIds, setSelectedTagIds] = useState(['all']);
    const [loadingState, setLoadingState] = useState({ progress: 0, message: 'Initializing...' });

    useEffect(() => {
        if (location.state?.refresh) refreshData();
        setFilteredNotes(applyFiltersAndSearch(notes, searchQuery, selectedTagIds));
    }, [notes, searchQuery, selectedTagIds, location.state?.refresh, refreshData]);

    const handleSearch = useCallback(debounce(query => setSearchQuery(query), 300), []);
    const handleFilterChange = tagIds => setSelectedTagIds(tagIds.length === 0 ? ['all'] : tagIds);

    const groupedNotes = useMemo(() => groupNotesByDate(filteredNotes), [filteredNotes]);

    if (isDriveLoading || isNotesLoading) {
        return <ProgressBar progress={loadingState.progress} message={loadingState.message} />;
    }

    if (error) {
        return <ErrorState error={error} />;
    }

    return (
        <div className="min-h-screen bg-bg-primary">
            <NavBar onSearch={handleSearch} />
            <main className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-8 space-y-6">
                <TagFilters tags={tags} onFilterChange={handleFilterChange} />
                {filteredNotes.length === 0 ? (
                    <div className="text-center text-text-primary/60 py-8">
                        No notes found.
                    </div>
                ) : (
                    <>
                        {groupedNotes.Today?.length > 0 && (
                            <NotesSection sectionKey="today" title="Today" notes={groupedNotes.Today} refreshNotes={refreshData} />
                        )}
                        {groupedNotes.Yesterday?.length > 0 && (
                            <NotesSection sectionKey="yesterday" title="Yesterday" notes={groupedNotes.Yesterday} refreshNotes={refreshData} />
                        )}
                        {Object.entries(groupedNotes.Earlier)
                            .filter(([, notes]) => notes.length > 0)
                            .map(([date, notes]) => (
                                <NotesSection key={date} sectionKey={date} title={date} notes={notes} refreshNotes={refreshData} />
                            ))}
                    </>
                )}
            </main>
        </div>
    );
}