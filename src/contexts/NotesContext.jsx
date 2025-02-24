import { createContext, useContext } from 'react';
import { useNotes } from '../hooks/useNotes'; // Your existing hook

// Create the context
const NotesContext = createContext(null);

// Provider component that uses useNotes
export function NotesProvider({ children }) {
  const notesHook = useNotes(); // Single instance of useNotes
  return (
    <NotesContext.Provider value={notesHook}>
      {children}
    </NotesContext.Provider>
  );
}

// Custom hook to access the context
export function useNotesContext() {
  const context = useContext(NotesContext);
  if (!context) {
    throw new Error('useNotesContext must be used within a NotesProvider');
  }
  return context;
}