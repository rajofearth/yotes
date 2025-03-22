// src/components/home/MobileHome.jsx
import React, { useMemo, useState, useEffect } from 'react';
import { VerticalNotesSection } from './notesSection'; // Updated import
import { TagFilters } from './TagFilters';
import NavBar from './navBar';
import { groupNotesByDate } from './grpNotesByDate';
import { ErrorState } from './ErrorState';
import { debounce, applyFiltersAndSearch } from '../../utils/noteFilters';

export default function MobileHome({
  notes,
  tags,
  error,
  refreshData,
  onSearch,
  onFilterChange,
  filteredNotes,
  setFilteredNotes,
}) {
  const groupedNotes = useMemo(() => groupNotesByDate(filteredNotes), [filteredNotes]);
  const [expandedSections, setExpandedSections] = useState({ today: true });

  useEffect(() => {
    setExpandedSections(prev => {
      const newExpanded = { today: true };
      if (groupedNotes.Yesterday?.length === 1) newExpanded.yesterday = true;
      Object.entries(groupedNotes.Earlier).forEach(([date, notes]) => {
        if (notes.length === 1) newExpanded[date] = true;
      });
      return { ...prev, ...newExpanded };
    });
  }, [groupedNotes]);

  if (error) return <ErrorState error={error} />;

  return (
    <div className="min-h-screen bg-bg-primary">
      <NavBar onSearch={onSearch} />
      <main className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-8 space-y-6">
        <TagFilters tags={tags} onFilterChange={onFilterChange} />
        {filteredNotes.length === 0 ? (
          <div className="text-center text-text-primary/60 py-8">No notes found, yo.</div>
        ) : (
          <div className="space-y-6">
            {groupedNotes.Today?.length > 0 && (
              <VerticalNotesSection
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
              <VerticalNotesSection
                sectionKey="yesterday"
                title="Yesterday"
                notes={groupedNotes.Yesterday}
                refreshNotes={refreshData}
                isExpanded={expandedSections.yesterday || false}
                toggleExpanded={() =>
                  setExpandedSections(prev => ({ ...prev, yesterday: !prev.yesterday }))
                }
              />
            )}
            {Object.entries(groupedNotes.Earlier)
              .filter(([, notes]) => notes.length > 0)
              .map(([date, notes]) => (
                <VerticalNotesSection
                  key={date}
                  sectionKey={date}
                  title={date}
                  notes={notes}
                  refreshNotes={refreshData}
                  isExpanded={expandedSections[date] || false}
                  toggleExpanded={() =>
                    setExpandedSections(prev => ({ ...prev, [date]: !prev[date] }))
                  }
                />
              ))}
          </div>
        )}
      </main>
    </div>
  );
}