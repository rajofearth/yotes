export const groupNotesByDate = (notes = []) => {
    const groups = {
        Today: [],
        Yesterday: [],
        Earlier: {}
    };

    if (!notes || notes.length === 0) {
        return groups;
    }

    const today = new Date().toLocaleDateString();
    const yesterday = new Date(Date.now() - 86400000).toLocaleDateString();

    notes.forEach(note => {
        if (!note.createdAt) return; // Skip if no date

        const noteDate = new Date(note.createdAt).toLocaleDateString();

        if (noteDate === today) {
            groups.Today.push(note);
        } else if (noteDate === yesterday) {
            groups.Yesterday.push(note);
        } else {
            if (!groups.Earlier[noteDate]) {
                groups.Earlier[noteDate] = [];
            }
            groups.Earlier[noteDate].push(note);
        }
    });

    return groups;
}; 