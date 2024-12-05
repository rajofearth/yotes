import { useState, useEffect } from 'react'
import { groupNotesByDate } from '../components/home/grpNotesByDate'
import { NotesSection } from '../components/home/renderSection'
import { TagFilters } from '../components/home/TagFilters'
import NavBar from '../components/home/navBar'
import notesData from '../data/notes.json'
import tagsData from '../data/tags.json'

export default function Home() {
    const [notes, setNotes] = useState([]);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    useEffect(() => {
        const processedNotes = notesData.notes.map(note => ({
            ...note,
            date: new Date(note.date),
            tags: note.tagIds.map(tagId => 
                tagsData.tags.find(tag => tag.id === tagId)
            )
        }));
        setNotes(processedNotes);
    }, []);

    const groupedNotes = groupNotesByDate(notes);

    return (
        <div className="min-h-screen bg-bg-primary">
            <NavBar />
            <main className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6 pb-8 space-y-6 sm:space-y-8">
                <TagFilters tags={tagsData.tags} />
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