import { useContext } from 'react';
import { NotesContext } from '../contexts/NotesContext';

export function useNotes() {
	return useContext(NotesContext);
}
