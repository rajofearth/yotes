import { useEffect, useState, useCallback, useMemo } from 'react';
import { useMediaQuery } from 'react-responsive';
import DesktopHome from '../components/home/DesktopHome';
import MobileHome from '../components/home/MobileHome';
import { useNotes } from '../hooks/useNotes';
import { useSettings } from '../hooks/useSettings';
import { useLocation, useNavigate } from 'react-router-dom';
import { applyFiltersAndSearch, debounce } from '../utils/noteFilters';
import { useOnlineStatus } from '../contexts/OnlineStatusContext';
import { canUseAIFeatures } from '../utils/aiSummaryService';

export default function Home() {
  const isDesktop = useMediaQuery({ minWidth: 768 }); 
  const { notes, tags, error, refreshData, refreshFromIndexedDB } = useNotes();
  const { aiSettings, handleTagAction } = useSettings();
  const location = useLocation();
  const navigate = useNavigate();
  const [filteredNotes, setFilteredNotes] = useState(notes);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTagIds, setSelectedTagIds] = useState(['all']);
  const [aiEnabled, setAiEnabled] = useState(false);
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

  // Check if AI features can be used
  useEffect(() => {
    const checkAiFeatures = async () => {
      const canUseAi = await canUseAIFeatures(isOnline);
      setAiEnabled(canUseAi);
    };
    
    checkAiFeatures();
  }, [isOnline, aiSettings]);

  useEffect(() => {
    if (location.state?.refresh) {
      if (isOnline) {
        refreshData();
      } else {
        refreshFromIndexedDB(); 
      }
      navigate('/', { replace: true, state: {} });
    }
    setFilteredNotes(applyFiltersAndSearch(notes, searchQuery, selectedTagIds));
  }, [notes, searchQuery, selectedTagIds, location.state?.refresh, refreshData, refreshFromIndexedDB, navigate, isOnline]);

  const handleSearch = useCallback(debounce(query => setSearchQuery(query), 300), []);
  const handleFilterChange = tagIds => setSelectedTagIds(tagIds.length === 0 ? ['all'] : tagIds);
  
  // Create tag from AI suggestions
  const handleCreateTag = useCallback((tagName) => {
    handleTagAction('create', {
      name: tagName,
      color: 'bg-blue-500/20 text-blue-500' // Default color for AI-suggested tags
    });
  }, [handleTagAction]);

  const commonProps = {
    notes,
    tags,
    error,
    refreshData: isOnline ? refreshData : refreshFromIndexedDB, 
    onSearch: handleSearch,
    onFilterChange: handleFilterChange,
    filteredNotes,
    setFilteredNotes,
    searchQuery,
    aiSettings: aiEnabled ? aiSettings : null,
    onCreateTag: handleCreateTag,
  };

  return isDesktop ? <DesktopHome {...commonProps} /> : <MobileHome {...commonProps} />;
}