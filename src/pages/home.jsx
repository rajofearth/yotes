// src/pages/home.jsx
import { useEffect, useState, useCallback, useMemo } from 'react';
import { useMediaQuery } from 'react-responsive';
import DesktopHome from '../components/home/DesktopHome';
import MobileHome from '../components/home/MobileHome';
import { useNotes } from '../contexts/NotesContext';
import { useLocation, useNavigate } from 'react-router-dom';
import { applyFiltersAndSearch, debounce } from '../utils/noteFilters';

export default function Home() {
  const isDesktop = useMediaQuery({ minWidth: 768 }); // 'lg' breakpoint
  const { notes, tags, error, refreshData } = useNotes();
  const location = useLocation();
  const navigate = useNavigate();
  const [filteredNotes, setFilteredNotes] = useState(notes);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTagIds, setSelectedTagIds] = useState(['all']);

  useEffect(() => {
    if (location.state?.refresh) {
      refreshData();
      navigate('/', { replace: true, state: {} });
    }
    setFilteredNotes(applyFiltersAndSearch(notes, searchQuery, selectedTagIds));
  }, [notes, searchQuery, selectedTagIds, location.state?.refresh, refreshData, navigate]);

  const handleSearch = useCallback(debounce(query => setSearchQuery(query), 300), []);
  const handleFilterChange = tagIds => setSelectedTagIds(tagIds.length === 0 ? ['all'] : tagIds);

  const commonProps = {
    notes,
    tags,
    error,
    refreshData,
    onSearch: handleSearch,
    onFilterChange: handleFilterChange,
    filteredNotes,
    setFilteredNotes,
  };

  return isDesktop ? <DesktopHome {...commonProps} /> : <MobileHome {...commonProps} />;
}