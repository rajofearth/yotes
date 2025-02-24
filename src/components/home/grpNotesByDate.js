export const groupNotesByDate = (notes = []) => {
    const now = new Date().setHours(0, 0, 0, 0);
    const fmt = new Intl.DateTimeFormat('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' });
    const todayStr = fmt.format(now).replace(/\//g, '-');
    const yesterdayStr = fmt.format(now - 86400000).replace(/\//g, '-');
    const earlier = new Map();

    const result = notes.reduce((g, n) => {
        if (!n?.createdAt) return g;
        const d = new Date(n.createdAt).setHours(0, 0, 0, 0);
        if (Number.isNaN(d)) return g;
        const ds = fmt.format(d).replace(/\//g, '-');
        
        if (d === now) g.Today.push(n);
        else if (d === now - 86400000) g.Yesterday.push(n);
        else earlier.set(ds, (earlier.get(ds) || []).concat(n));
        return g;
    }, { Today: [], Yesterday: [], Earlier: {} });

    result.Earlier = Object.fromEntries(earlier);
    return result;
};