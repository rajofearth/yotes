export const groupNotesByDate = (notes = []) => {
    const today = new Date().toLocaleDateString();
    const yesterday = new Date(Date.now() - 86400000).toLocaleDateString();

    return notes.reduce((groups, note) => {
        if (!note?.createdAt) return groups;
        const noteDate = new Date(note.createdAt).toLocaleDateString();

        if (noteDate === today) {
            groups.Today.push(note);
        } else if (noteDate === yesterday) {
            groups.Yesterday.push(note);
        } else {
            groups.Earlier[noteDate] = groups.Earlier[noteDate] || [];
            groups.Earlier[noteDate].push(note);
        }
        return groups;
    }, { Today: [], Yesterday: [], Earlier: {} });
};