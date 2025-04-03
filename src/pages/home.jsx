// src/pages/home.jsx
import { useEffect, useState, useCallback, useMemo } from 'react';
import { useMediaQuery } from 'react-responsive';
import DesktopHome from '../components/home/DesktopHome';
import MobileHome from '../components/home/MobileHome';
import { useNotes } from '../contexts/NotesContext';
import { useLocation, useNavigate } from 'react-router-dom';
import { applyFiltersAndSearch, debounce } from '../utils/noteFilters';
import { useOnlineStatus } from '../contexts/OnlineStatusContext';

export default function Home() {
  const isDesktop = useMediaQuery({ minWidth: 768 }); // 'lg' breakpoint
  const { notes, tags, error, refreshData, refreshFromIndexedDB } = useNotes();
  const location = useLocation();
  const navigate = useNavigate();
  const [filteredNotes, setFilteredNotes] = useState(notes);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTagIds, setSelectedTagIds] = useState(['all']);
  const isOnline = useOnlineStatus();

  // Force refresh from IndexedDB when component mounts, especially in offline mode
  useEffect(() => {
    // Immediately refresh from IndexedDB when page loads, especially important offline
    const loadDataFromIndexedDB = async () => {
      try {
        await refreshFromIndexedDB();
        console.log('Home: Refreshed data from IndexedDB');
      } catch (err) {
        console.error('Failed to refresh data from IndexedDB:', err);
      }
    };
    loadDataFromIndexedDB();
  }, [refreshFromIndexedDB]);

  useEffect(() => {
    if (location.state?.refresh) {
      if (isOnline) {
        refreshData();
      } else {
        refreshFromIndexedDB(); // Use IndexedDB refresh when offline
      }
      navigate('/', { replace: true, state: {} });
    }
    setFilteredNotes(applyFiltersAndSearch(notes, searchQuery, selectedTagIds));
  }, [notes, searchQuery, selectedTagIds, location.state?.refresh, refreshData, refreshFromIndexedDB, navigate, isOnline]);

  const handleSearch = useCallback(debounce(query => setSearchQuery(query), 300), []);
  const handleFilterChange = tagIds => setSelectedTagIds(tagIds.length === 0 ? ['all'] : tagIds);

  const commonProps = {
    notes,
    tags,
    error,
    refreshData: isOnline ? refreshData : refreshFromIndexedDB, // Use appropriate refresh method
    onSearch: handleSearch,
    onFilterChange: handleFilterChange,
    filteredNotes,
    setFilteredNotes,
  };

  return isDesktop ? <DesktopHome {...commonProps} /> : <MobileHome {...commonProps} />;
}