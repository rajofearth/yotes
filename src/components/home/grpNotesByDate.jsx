const groupNotesByDate = (notes = []) => {
    const groups = {
        Today: [],
        Yesterday: [],
        Earlier: {}
    };

    if (!notes || notes.length === 0) return groups;

    const today = new Date().setHours(0, 0, 0, 0);
    const yesterday = new Date(today - 86400000).setHours(0, 0, 0, 0);

    notes.forEach(note => {
        const noteDate = new Date(note.date).setHours(0, 0, 0, 0);
        if (noteDate === today) {
            groups.Today.push(note);
        } else if (noteDate === yesterday) {
            groups.Yesterday.push(note);
        } else {
            const dateStr = note.date.toLocaleDateString('en-GB');
            if (!groups.Earlier[dateStr]) groups.Earlier[dateStr] = [];
            groups.Earlier[dateStr].push(note);
        }
    });

    return groups;
};

export { groupNotesByDate };