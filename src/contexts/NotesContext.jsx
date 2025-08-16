import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useOnlineStatus } from './OnlineStatusContext';
import { useConvex, useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { deriveKekFromPassphrase, unwrapDek, generateDek, wrapDek, encryptString, decryptString, generateSaltB64 } from '../lib/e2ee';
import { PassphraseModal } from '../components/PassphraseModal';

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
    const dekRef = useRef(null); // CryptoKey for data encryption
    const e2eeReadyRef = useRef(false);
    
    // Passphrase modal state
    const [showPassphraseModal, setShowPassphraseModal] = useState(false);
    const [isFirstTimeSetup, setIsFirstTimeSetup] = useState(false);
    const [passphraseCallback, setPassphraseCallback] = useState(null);
    
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
                
                // Ensure user exists; also pass through any existing E2EE fields unchanged
                const id = await ensureUser({
                    externalId: session.user.id,
                    email: session.user.email ?? 'unknown@example.com',
                    displayName: session.user.user_metadata?.full_name ?? undefined,
                    avatarUrl: session.user.user_metadata?.avatar_url ?? undefined,
                });
                setConvexUserId(id);
                setLoadingState({ progress: 60, message: 'Preparing encryption...' });

                // Fetch user doc to read E2EE metadata
                const userDoc = await convex.query(api.users.byExternalId, { externalId: session.user.id });
                
                // Check if we have a stored passphrase
                const storedPassphrase = sessionStorage.getItem('yotes_passphrase');
                
                if (userDoc?.wrappedDekB64 && userDoc?.wrappedDekIvB64 && userDoc?.encSaltB64 && userDoc?.encIterations) {
                    // User has E2EE setup - need passphrase to unlock
                    if (storedPassphrase) {
                        try {
                            const kek = await deriveKekFromPassphrase(storedPassphrase, userDoc.encSaltB64, userDoc.encIterations);
                            const dek = await unwrapDek(userDoc.wrappedDekB64, userDoc.wrappedDekIvB64, kek);
                            dekRef.current = dek; 
                            e2eeReadyRef.current = true;
                        } catch (err) {
                            // Stored passphrase is wrong - clear it and show modal
                            sessionStorage.removeItem('yotes_passphrase');
                            setShowPassphraseModal(true);
                            setIsFirstTimeSetup(false);
                            setPassphraseCallback(() => async (passphrase) => {
                                const kek = await deriveKekFromPassphrase(passphrase, userDoc.encSaltB64, userDoc.encIterations);
                                const dek = await unwrapDek(userDoc.wrappedDekB64, userDoc.wrappedDekIvB64, kek);
                                dekRef.current = dek; 
                                e2eeReadyRef.current = true;
                                sessionStorage.setItem('yotes_passphrase', passphrase);
                                setShowPassphraseModal(false);
                            });
                            return;
                        }
                    } else {
                        // No stored passphrase - show unlock modal
                        setShowPassphraseModal(true);
                        setIsFirstTimeSetup(false);
                        setPassphraseCallback(() => async (passphrase) => {
                            const kek = await deriveKekFromPassphrase(passphrase, userDoc.encSaltB64, userDoc.encIterations);
                            const dek = await unwrapDek(userDoc.wrappedDekB64, userDoc.wrappedDekIvB64, kek);
                            dekRef.current = dek; 
                            e2eeReadyRef.current = true;
                            sessionStorage.setItem('yotes_passphrase', passphrase);
                            setShowPassphraseModal(false);
                        });
                        return;
                    }
                } else {
                    // First-time setup: need to create E2EE setup
                    setShowPassphraseModal(true);
                    setIsFirstTimeSetup(true);
                    setPassphraseCallback(() => async (passphrase) => {
                        const saltB64 = generateSaltB64();
                        const iterations = 310000;
                        const kek = await deriveKekFromPassphrase(passphrase, saltB64, iterations);
                        const dek = await generateDek();
                        const { wrappedDekB64, wrappedIvB64 } = await wrapDek(dek, kek);
                        dekRef.current = dek; 
                        e2eeReadyRef.current = true;
                        sessionStorage.setItem('yotes_passphrase', passphrase);
                        
                        // Store e2ee metadata on user
                        await ensureUser({
                            externalId: session.user.id,
                            email: session.user.email ?? 'unknown@example.com',
                            displayName: session.user.user_metadata?.full_name ?? undefined,
                            avatarUrl: session.user.user_metadata?.avatar_url ?? undefined,
                            encSaltB64: saltB64,
                            encIterations: iterations,
                            wrappedDekB64,
                            wrappedDekIvB64: wrappedIvB64,
                        });
                        setShowPassphraseModal(false);
                    });
                    return;
                }

                setLoadingState({ progress: 80, message: 'Loading data...' });
            } catch (e) {
                setError(e);
            } finally {
                setIsInitialSync(false);
            }
        })();
    }, [session, ensureUser, convex]);

    // Subscribe to Convex data and normalize to frontend shape
    useEffect(() => {
        if (!session) return;

        if (Array.isArray(listTags)) {
            const normalizedTags = listTags.map((t) => ({
                ...t,
                id: t._id,
            }));
            setTags(normalizedTags);
        }

        if (Array.isArray(listNotes)) {
            const decryptIfPossible = async (n) => {
                if (!e2eeReadyRef.current || !dekRef.current) return n;
                try {
                    const patched = { ...n };
                    if (n.titleEnc?.ct && n.titleEnc?.iv) patched.title = await decryptString(dekRef.current, n.titleEnc);
                    if (n.descriptionEnc?.ct && n.descriptionEnc?.iv) patched.description = await decryptString(dekRef.current, n.descriptionEnc);
                    if (n.contentEnc?.ct && n.contentEnc?.iv) patched.content = await decryptString(dekRef.current, n.contentEnc);
                    return patched;
                } catch {
                    return n; // best-effort
                }
            };
            (async () => {
                const decrypted = await Promise.all(listNotes.map(decryptIfPossible));
                const normalizedNotes = decrypted.map((n) => ({
                    ...n,
                    id: n._id,
                    tags: Array.isArray(n.tags) ? n.tags.map((tid) => String(tid)) : [],
                }));
                setNotes(normalizedNotes);
            })();
        }

        if (listNotes !== undefined || listTags !== undefined) {
            setIsLoading(false);
            setLoadingState({ progress: 100, message: 'Data loaded' });
        }
    }, [session, listNotes, listTags]);

    const createNote = useCallback(async (noteData) => {
        if (!session?.user?.id) throw new Error('Not authenticated');
        let payload = {
            userId: convexUserId,
            title: undefined,
            description: undefined,
            content: undefined,
            titleEnc: undefined,
            descriptionEnc: undefined,
            contentEnc: undefined,
            tags: noteData.tags ?? [],
        };
        if (e2eeReadyRef.current && dekRef.current) {
            payload.titleEnc = noteData.title ? await encryptString(dekRef.current, noteData.title) : undefined;
            payload.descriptionEnc = noteData.description ? await encryptString(dekRef.current, noteData.description) : undefined;
            payload.contentEnc = noteData.content ? await encryptString(dekRef.current, noteData.content) : undefined;
        } else {
            payload.title = noteData.title ?? undefined;
            payload.description = noteData.description ?? undefined;
            payload.content = noteData.content ?? undefined;
        }
        const created = await createNoteMutation(payload);
        // Normalize return for callers expecting id
        return {
            ...created,
            id: created?._id,
            tags: Array.isArray(created?.tags) ? created.tags.map((tid) => String(tid)) : [],
        };
    }, [createNoteMutation, session, convexUserId]);

    const deleteNote = useCallback(async (noteId) => {
        await deleteNoteMutation({ id: noteId });
    }, [deleteNoteMutation]);

    const updateNote = useCallback(async (noteId, noteData) => {
        let payload = {
            id: noteId,
            title: undefined,
            description: undefined,
            content: undefined,
            titleEnc: undefined,
            descriptionEnc: undefined,
            contentEnc: undefined,
            tags: noteData.tags ?? undefined,
        };
        if (e2eeReadyRef.current && dekRef.current) {
            payload.titleEnc = noteData.title !== undefined ? (noteData.title ? await encryptString(dekRef.current, noteData.title) : undefined) : undefined;
            payload.descriptionEnc = noteData.description !== undefined ? (noteData.description ? await encryptString(dekRef.current, noteData.description) : undefined) : undefined;
            payload.contentEnc = noteData.content !== undefined ? (noteData.content ? await encryptString(dekRef.current, noteData.content) : undefined) : undefined;
        } else {
            payload.title = noteData.title ?? undefined;
            payload.description = noteData.description ?? undefined;
            payload.content = noteData.content ?? undefined;
        }
        const updated = await updateNoteMutation(payload);
        return {
            ...updated,
            id: updated?._id,
            tags: Array.isArray(updated?.tags) ? updated.tags.map((tid) => String(tid)) : [],
        };
    }, [updateNoteMutation]);

    const createTag = useCallback(async (tagData) => {
        if (!session?.user?.id) throw new Error('Not authenticated');
        const color = tagData.color || 'bg-gray-500/20 text-gray-500';
        const created = await createTagMutation({ userId: convexUserId, name: tagData.name, color });
        return { ...created, id: created?._id };
    }, [createTagMutation, session, convexUserId]);

    const updateTag = useCallback(async (tagId, tagData) => {
        const updated = await updateTagMutation({ id: tagId, name: tagData.name, color: tagData.color });
        return { ...updated, id: updated?._id };
    }, [updateTagMutation]);

    const deleteTag = useCallback(async (tagId) => {
        await deleteTagMutation({ id: tagId });
    }, [deleteTagMutation]);

    const refreshData = useCallback(async () => {}, []);

    const refreshFromIndexedDB = useCallback(async () => {}, []);

    const handlePassphraseConfirm = async (passphrase) => {
        if (passphraseCallback) {
            await passphraseCallback(passphrase);
        }
    };

    const handlePassphraseCancel = () => {
        setShowPassphraseModal(false);
        // Could redirect to login or show error
    };

    const lockNotes = useCallback(() => {
        dekRef.current = null;
        e2eeReadyRef.current = false;
        sessionStorage.removeItem('yotes_passphrase');
        setShowPassphraseModal(true);
        setIsFirstTimeSetup(false);
        setPassphraseCallback(() => async (passphrase) => {
            const userDoc = await convex.query(api.users.byExternalId, { externalId: session.user.id });
            if (userDoc?.wrappedDekB64 && userDoc?.wrappedDekIvB64 && userDoc?.encSaltB64 && userDoc?.encIterations) {
                const kek = await deriveKekFromPassphrase(passphrase, userDoc.encSaltB64, userDoc.encIterations);
                const dek = await unwrapDek(userDoc.wrappedDekB64, userDoc.wrappedDekIvB64, kek);
                dekRef.current = dek; 
                e2eeReadyRef.current = true;
                sessionStorage.setItem('yotes_passphrase', passphrase);
                setShowPassphraseModal(false);
            } else {
                throw new Error('No encryption setup found');
            }
        });
    }, [convex, session]);

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
            // E2EE functions
            isE2EEReady: e2eeReadyRef.current,
            lockNotes,
        }}>
            {children}
            
            {/* Passphrase Modal */}
            <PassphraseModal
                isOpen={showPassphraseModal}
                onConfirm={handlePassphraseConfirm}
                isFirstTime={isFirstTimeSetup}
                onCancel={handlePassphraseCancel}
            />
        </NotesContext.Provider>
    );
}

export const useNotes = () => useContext(NotesContext);