export const applyFiltersAndSearch = (notesList, query, tagIds) => {
    let filtered = [...notesList];
    
    // Apply tag filtering
    if (!tagIds.includes('all') && tagIds.length > 0) {
        filtered = filtered.filter(note => 
            note.tags?.some(tagId => tagIds.includes(tagId))
        );
    }
    
    // Apply search query
    if (query) {
        const lowerQuery = query.toLowerCase();
        filtered = filtered.filter(note =>
            note.title?.toLowerCase().includes(lowerQuery) ||
            note.description?.toLowerCase().includes(lowerQuery) ||
            note.content?.toLowerCase().includes(lowerQuery)
        );
    }
    
    return filtered;
};

export const debounce = (func, delay) => {
    let timeoutId;
    return (...args) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func(...args), delay);
    };
};