import React, { useMemo, useState, useEffect } from 'react';
import { VerticalNotesSection, HorizontalNotesSection } from './notesSection';
import { TagFilters } from './TagFilters';
import NavBar from './navBar';
import { groupNotesByDate } from './grpNotesByDate';
import { ErrorState } from './ErrorState';
import { AISummaryCard } from './AISummaryCard';

export default function DesktopHome({
  notes,
  tags,
  error,
  refreshData,
  onSearch,
  onFilterChange,
  filteredNotes,
  setFilteredNotes,
  searchQuery,
  aiSettings,
  onCreateTag
}) {
  const groupedNotes = useMemo(() => groupNotesByDate(filteredNotes), [filteredNotes]);

  if (error) return <ErrorState error={error} />;

  return (
    <div className="min-h-screen bg-bg-primary">
      <NavBar onSearch={onSearch} />
      <main className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-8 space-y-6">
        <TagFilters tags={tags} onFilterChange={onFilterChange} />
        
        {/* AI Summary Card - shown only when aiSettings are available and there's a search query */}
        {aiSettings && searchQuery && (
          <AISummaryCard 
            notes={filteredNotes} 
            searchQuery={searchQuery} 
            aiSettings={aiSettings}
            onCreateTag={onCreateTag}
          />
        )}
        
        {filteredNotes.length === 0 ? (
          <div className="text-center text-text-primary/60 py-8">No notes found, yo.</div>
        ) : (
          <div className="space-y-6">
            {groupedNotes.Today?.length > 0 && (
              <HorizontalNotesSection
                sectionKey="today"
                title="Today"
                notes={groupedNotes.Today}
                refreshNotes={refreshData}
              />
            )}
            {groupedNotes.Yesterday?.length > 0 && (
              <HorizontalNotesSection
                sectionKey="yesterday"
                title="Yesterday"
                notes={groupedNotes.Yesterday}
                refreshNotes={refreshData}
              />
            )}
            {Object.entries(groupedNotes.Earlier)
              .filter(([, notes]) => notes.length > 0)
              .map(([date, notes]) => (
                <HorizontalNotesSection
                  key={date}
                  sectionKey={date}
                  title={date}
                  notes={notes}
                  refreshNotes={refreshData}
                />
              ))}
          </div>
        )}
      </main>
    </div>
  );
}