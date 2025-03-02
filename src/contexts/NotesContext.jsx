import { createContext, useContext } from 'react';
import { useNotes as useNotesHook } from '../hooks/useNotes';

const NotesContext = createContext(null);

export function NotesProvider({ children }) {
    const notesData = useNotesHook();
    return <NotesContext.Provider value={notesData}>{children}</NotesContext.Provider>;
}

export function useNotes() {
    const context = useContext(NotesContext);
    if (!context) {
        throw new Error('useNotes must be used within a NotesProvider');
    }
    return context;
}