import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useOnlineStatus } from './OnlineStatusContext';
import { useConvex, useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';

export const NotesContext = createContext();

export function NotesProvider({ children, session }) {
    const [notes, setNotes] = useState([]);
    const [tags, setTags] = useState([]);
    const [error, setError] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSyncing] = useState(false);
    const [isInitialSync, setIsInitialSync] = useState(true);
    const [loadingState, setLoadingState] = useState({ progress: 0, message: 'Initializing...' });
    const isOnline = useOnlineStatus();
    const convex = useConvex();
    const ensureUser = useMutation(api.users.ensure);
    const [convexUserId, setConvexUserId] = useState(null);
    const listNotes = useQuery(api.notes.list, convexUserId ? { userId: convexUserId } : 'skip');
    const listTags = useQuery(api.tags.list, convexUserId ? { userId: convexUserId } : 'skip');
    const createNoteMutation = useMutation(api.notes.create);
    const updateNoteMutation = useMutation(api.notes.update);
    const deleteNoteMutation = useMutation(api.notes.remove);
    const createTagMutation = useMutation(api.tags.create);
    const updateTagMutation = useMutation(api.tags.update);
    const deleteTagMutation = useMutation(api.tags.remove);

    // No deduplication needed with Convex as source of truth

    // Remove IndexedDB/Drive: live Convex data subscription
    useEffect(() => {
            if (!session) {
                setIsLoading(false);
                return;
            }
        (async () => {
            try {
                setLoadingState({ progress: 40, message: 'Connecting to Convex...' });
                // Ensure user exists in Convex
                const id = await ensureUser({
                    externalId: session.user.id,
                    email: session.user.email ?? 'unknown@example.com',
                    displayName: session.user.user_metadata?.full_name ?? undefined,
                    avatarUrl: session.user.user_metadata?.avatar_url ?? undefined,
                });
                setConvexUserId(id);
                setLoadingState({ progress: 70, message: 'Loading data...' });
            } catch (e) {
                setError(e);
            } finally {
                setIsInitialSync(false);
            }
        })();
    }, [session, ensureUser]);

    // Subscribe to Convex data
    useEffect(() => {
        if (!session) return;
        if (Array.isArray(listNotes)) setNotes(listNotes);
        if (Array.isArray(listTags)) setTags(listTags);
        if (listNotes !== undefined || listTags !== undefined) {
            setIsLoading(false);
            setLoadingState({ progress: 100, message: 'Data loaded' });
        }
    }, [session, listNotes, listTags]);

    const createNote = useCallback(async (noteData) => {
        if (!session?.user?.id) throw new Error('Not authenticated');
        const created = await createNoteMutation({
            userId: convexUserId,
            title: noteData.title ?? undefined,
            description: noteData.description ?? undefined,
            content: noteData.content ?? undefined,
            tags: noteData.tags ?? [],
        });
        return created;
    }, [createNoteMutation, session, convexUserId]);

    const deleteNote = useCallback(async (noteId) => {
        await deleteNoteMutation({ id: noteId });
    }, [deleteNoteMutation]);

    const updateNote = useCallback(async (noteId, noteData) => {
        const updated = await updateNoteMutation({
            id: noteId,
            title: noteData.title ?? undefined,
            description: noteData.description ?? undefined,
            content: noteData.content ?? undefined,
            tags: noteData.tags ?? undefined,
        });
        return updated;
    }, [updateNoteMutation]);

    const createTag = useCallback(async (tagData) => {
        if (!session?.user?.id) throw new Error('Not authenticated');
        return await createTagMutation({ userId: convexUserId, name: tagData.name, color: tagData.color });
    }, [createTagMutation, session, convexUserId]);

    const updateTag = useCallback(async (tagId, tagData) => {
        return await updateTagMutation({ id: tagId, name: tagData.name, color: tagData.color });
    }, [updateTagMutation]);

    const deleteTag = useCallback(async (tagId) => {
        await deleteTagMutation({ id: tagId });
    }, [deleteTagMutation]);

    const refreshData = useCallback(async () => {}, []);

    const refreshFromIndexedDB = useCallback(async () => {}, []);

    return (
        <NotesContext.Provider value={{
            notes,
            tags,
            error,
            isLoading,
            isSyncing,
            isInitialSync,
            loadingState,
            convexUserId,
            createNote,
            deleteNote,
            updateNote,
            createTag,
            updateTag,
            deleteTag,
            refreshData: async () => {},
            refreshFromIndexedDB: async () => {},
            // Legacy fields kept for UI compatibility
            hasPendingChanges: false,
            manualSyncWithDrive: async () => {},
            isManualSyncing: false,
            syncProgressMessage: '',
            syncDiscrepancyDetected: false,
            checkSyncDiscrepancies: async () => false,
        }}>
            {children}
        </NotesContext.Provider>
    );
}

export const useNotes = () => useContext(NotesContext);