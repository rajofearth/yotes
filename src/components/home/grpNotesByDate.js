export const groupNotesByDate = (notes = []) => {
    const now = new Date().setHours(0, 0, 0, 0);
    const fmt = new Intl.DateTimeFormat('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' });
    const earlierByDayStart = new Map(); // key: dayStart (number), value: Note[]

    const result = notes.reduce((groups, note) => {
        if (!note?.createdAt) return groups;
        const dayStart = new Date(note.createdAt).setHours(0, 0, 0, 0);
        if (Number.isNaN(dayStart)) return groups;

        if (dayStart === now) groups.Today.push(note);
        else if (dayStart === now - 86400000) groups.Yesterday.push(note);
        else {
            const existing = earlierByDayStart.get(dayStart) || [];
            earlierByDayStart.set(dayStart, existing.concat(note));
        }
        return groups;
    }, { Today: [], Yesterday: [], Earlier: {} });

    // Sort notes within each group by createdAt (newest first)
    result.Today.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    result.Yesterday.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Build Earlier groups sorted by date (newest day first), and sort notes inside each day
    const sortedEarlierEntries = Array.from(earlierByDayStart.entries())
        .sort((a, b) => b[0] - a[0])
        .map(([dayStart, notesInDay]) => {
            const label = fmt.format(dayStart).replace(/\//g, '-');
            const sortedNotes = notesInDay.slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            return [label, sortedNotes];
        });

    result.Earlier = Object.fromEntries(sortedEarlierEntries);
    return result;
};