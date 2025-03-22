import { useEffect, useState, useCallback, useMemo } from 'react';
import { groupNotesByDate } from '../components/home/grpNotesByDate';
import { NotesSection } from '../components/home/notesSection';
import { TagFilters } from '../components/home/TagFilters';
import NavBar from '../components/home/navBar';
import { useNotes } from '../contexts/NotesContext';
import { useLocation } from 'react-router-dom';
import { applyFiltersAndSearch, debounce } from '../utils/noteFilters';
import { ErrorState } from '../components/home/ErrorState';
import { useNavigate } from 'react-router-dom';

export default function Home() {
    const navigate = useNavigate();
    const { notes, tags, error, refreshData } = useNotes();
    const location = useLocation();
    const [filteredNotes, setFilteredNotes] = useState(notes);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedTagIds, setSelectedTagIds] = useState(['all']);
    const groupedNotes = useMemo(() => groupNotesByDate(filteredNotes), [filteredNotes]);
    const [expandedSections, setExpandedSections] = useState({ today: true }); // Default with "today" expanded

    // Sync expandedSections with note counts whenever groupedNotes changes
    useEffect(() => {
        setExpandedSections(prev => {
            const newExpanded = { today: true }; // Always expand "today"
            if (groupedNotes.Yesterday?.length === 1) newExpanded.yesterday = true;
            Object.entries(groupedNotes.Earlier).forEach(([date, notes]) => {
                if (notes.length === 1) newExpanded[date] = true;
            });
            return { ...prev, ...newExpanded }; // Merge with prev to keep manual toggles
        });
    }, [groupedNotes]);

    useEffect(() => {
        if (location.state?.refresh) {
            refreshData();
            navigate('/', { replace: true, state: {} });
        }
        setFilteredNotes(applyFiltersAndSearch(notes, searchQuery, selectedTagIds));
    }, [notes, searchQuery, selectedTagIds, location.state?.refresh, refreshData, navigate]);

    const handleSearch = useCallback(debounce(query => setSearchQuery(query), 300), []);
    const handleFilterChange = tagIds => setSelectedTagIds(tagIds.length === 0 ? ['all'] : tagIds);

    if (error) return <ErrorState error={error} />;

    return (
        <div className="min-h-screen bg-bg-primary">
            <NavBar onSearch={handleSearch} />
            <main className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-8 space-y-6">
                <TagFilters tags={tags} onFilterChange={handleFilterChange} />
                {filteredNotes.length === 0 ? (
                    <div className="text-center text-text-primary/60 py-8">No notes found.</div>
                ) : (
                    <>
                        {groupedNotes.Today?.length > 0 && (
                            <NotesSection
                                sectionKey="today"
                                title="Today"
                                notes={groupedNotes.Today}
                                refreshNotes={refreshData}
                                isExpanded={expandedSections.today}
                                toggleExpanded={() =>
                                    setExpandedSections(prev => ({ ...prev, today: !prev.today }))
                                }
                            />
                        )}
                        {groupedNotes.Yesterday?.length > 0 && (
                            <NotesSection
                                sectionKey="yesterday"
                                title="Yesterday"
                                notes={groupedNotes.Yesterday}
                                refreshNotes={refreshData}
                                isExpanded={expandedSections.yesterday || false}
                                toggleExpanded={() =>
                                    setExpandedSections(prev => ({
                                        ...prev,
                                        yesterday: !prev.yesterday,
                                    }))
                                }
                            />
                        )}
                        {Object.entries(groupedNotes.Earlier)
                            .filter(([, notes]) => notes.length > 0)
                            .map(([date, notes]) => (
                                <NotesSection
                                    key={date}
                                    sectionKey={date}
                                    title={date}
                                    notes={notes}
                                    refreshNotes={refreshData}
                                    isExpanded={expandedSections[date] || false}
                                    toggleExpanded={() =>
                                        setExpandedSections(prev => ({
                                            ...prev,
                                            [date]: !prev[date],
                                        }))
                                    }
                                />
                            ))}
                    </>
                )}
            </main>
        </div>
    );
}