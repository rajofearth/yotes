import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useOnlineStatus } from './OnlineStatusContext';
import { useConvex, useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { deriveKekFromPassphrase, unwrapDek, generateDek, wrapDek, encryptString, decryptString, generateSaltB64 } from '../lib/e2ee';
import { getFromDB, setInDB } from '../utils/indexedDB';
import { PassphraseModal } from '../components/PassphraseModal';
import { queueForBackgroundSync, listenForServiceWorkerMessages, isOnline } from '../utils/backgroundSync';

export const NotesContext = createContext();

export function NotesProvider({ children, session }) {
    const [notes, setNotes] = useState([]);
    const [tags, setTags] = useState([]);
    const [error, setError] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSyncing] = useState(false);
    const [isInitialSync, setIsInitialSync] = useState(true);
    const [loadingState, setLoadingState] = useState({ progress: 0, message: 'Initializing...' });
    const [syncStatus, setSyncStatus] = useState({ pending: 0, lastSync: null, error: null });
    const isOnlineStatus = useOnlineStatus();
    const convex = useConvex();
    const ensureUser = useMutation(api.users.ensure);
    const [convexUserId, setConvexUserId] = useState(null);
    const dekRef = useRef(null);
    const e2eeReadyRef = useRef(false);
    const [isE2EEReady, setIsE2EEReady] = useState(false);
    const [showPassphraseModal, setShowPassphraseModal] = useState(false);
    const [isFirstTimeSetup, setIsFirstTimeSetup] = useState(false);
    const [passphraseCallback, setPassphraseCallback] = useState(null);

    // Listen for service worker sync messages
    useEffect(() => {
        const cleanup = listenForServiceWorkerMessages((message) => {
            if (message.type === 'SYNC_COMPLETE') {
                setSyncStatus(prev => ({
                    ...prev,
                    lastSync: Date.now(),
                    error: message.success ? null : message.error,
                    pending: message.success ? 0 : prev.pending
                }));
            }
        });

        return cleanup;
    }, []);

    const listNotes = useQuery(api.notes.secureList, session?.user?.id && isE2EEReady ? { externalId: session.user.id } : 'skip');
    const listTags = useQuery(api.tags.secureList, session?.user?.id && isE2EEReady ? { externalId: session.user.id } : 'skip');
    const createNoteMutation = useMutation(api.notes.create);
    const updateNoteMutation = useMutation(api.notes.update);
    const deleteNoteMutation = useMutation(api.notes.remove);
    const createTagMutation = useMutation(api.tags.create);
    const updateTagMutation = useMutation(api.tags.update);
    const deleteTagMutation = useMutation(api.tags.remove);

    useEffect(() => {
            if (!session) {
                setIsLoading(false);
                return;
            }
        (async () => {
            try {
                setLoadingState({ progress: 40, message: 'Connecting to Convex...' });
                const id = await ensureUser({
                    externalId: session.user.id,
                    email: session.user.email ?? 'unknown@example.com',
                    displayName: session.user.user_metadata?.full_name ?? undefined,
                    avatarUrl: session.user.user_metadata?.avatar_url ?? undefined,
                });
                setConvexUserId(id);
                setLoadingState({ progress: 60, message: 'Preparing encryption...' });

                const userDoc = await convex.query(api.users.byExternalId, { externalId: session.user.id });

                // Try local device unlock first (uses IndexedDB JWK + locally wrapped DEK)
                try {
                    const localJwk = await getFromDB('sessions', 'local_wrap_jwk');
                    const localWrapped = await getFromDB('sessions', 'local_wrapped_dek');
                    const localSentinel = await getFromDB('sessions', 'local_dek_sentinel');
                    if (localJwk && localWrapped?.wrappedDekB64 && localWrapped?.wrappedIvB64) {
                        const localWrapKey = await crypto.subtle.importKey(
                            'jwk', localJwk, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']
                        );
                        const dek = await unwrapDek(localWrapped.wrappedDekB64, localWrapped.wrappedIvB64, localWrapKey);
                        // Verify DEK belongs to this user by decrypting sentinel
                        if (!localSentinel?.ct || !localSentinel?.iv) throw new Error('Missing local sentinel');
                        const sentinelExpected = `yotes_sentinel:${id}`;
                        const sentinelPlain = await decryptString(dek, localSentinel);
                        if (sentinelPlain !== sentinelExpected) throw new Error('Sentinel mismatch');
                        dekRef.current = dek; e2eeReadyRef.current = true; setIsE2EEReady(true); window.__yotesDek = dekRef.current;
                        setLoadingState({ progress: 80, message: 'Loading data...' });
                        return;
                    }
                } catch {}

                if (userDoc?.wrappedDekB64 && userDoc?.wrappedDekIvB64 && userDoc?.encSaltB64 && userDoc?.encIterations) {
                    setShowPassphraseModal(true);
                    setIsFirstTimeSetup(false);
                    setPassphraseCallback(() => async (passphrase) => {
                        const kek = await deriveKekFromPassphrase(passphrase, userDoc.encSaltB64, userDoc.encIterations);
                        const dek = await unwrapDek(userDoc.wrappedDekB64, userDoc.wrappedDekIvB64, kek);
                        dekRef.current = dek; 
                        e2eeReadyRef.current = true;
                        setIsE2EEReady(true);
                        window.__yotesDek = dekRef.current;
                        // Store local wrapped DEK with device key to avoid re-prompt next time
                        try {
                            let localJwk = await getFromDB('sessions', 'local_wrap_jwk');
                            let localWrapKey;
                            if (!localJwk) {
                                localWrapKey = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
                                localJwk = await crypto.subtle.exportKey('jwk', localWrapKey);
                                await setInDB('sessions', 'local_wrap_jwk', localJwk);
                            } else {
                                localWrapKey = await crypto.subtle.importKey('jwk', localJwk, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
                            }
                            const { wrappedDekB64, wrappedIvB64 } = await wrapDek(dekRef.current, localWrapKey);
                            await setInDB('sessions', 'local_wrapped_dek', { wrappedDekB64, wrappedIvB64 });
                            const sentinelExpected = `yotes_sentinel:${id}`;
                            const sentinelEnc = await encryptString(dekRef.current, sentinelExpected);
                            await setInDB('sessions', 'local_dek_sentinel', sentinelEnc);
                        } catch {}
                        setShowPassphraseModal(false);
                    });
                    return;
                } else {
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
                        setIsE2EEReady(true);
                        window.__yotesDek = dekRef.current;
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
                        // Store local wrapped DEK with device key
                        try {
                            let localJwk = await getFromDB('sessions', 'local_wrap_jwk');
                            let localWrapKey;
                            if (!localJwk) {
                                localWrapKey = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
                                localJwk = await crypto.subtle.exportKey('jwk', localWrapKey);
                                await setInDB('sessions', 'local_wrap_jwk', localJwk);
                            } else {
                                localWrapKey = await crypto.subtle.importKey('jwk', localJwk, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
                            }
                            const { wrappedDekB64: localWrappedDekB64, wrappedIvB64: localWrappedIvB64 } = await wrapDek(dekRef.current, localWrapKey);
                            await setInDB('sessions', 'local_wrapped_dek', { wrappedDekB64: localWrappedDekB64, wrappedIvB64: localWrappedIvB64 });
                            const sentinelExpected = `yotes_sentinel:${id}`;
                            const sentinelEnc = await encryptString(dekRef.current, sentinelExpected);
                            await setInDB('sessions', 'local_dek_sentinel', sentinelEnc);
                        } catch {}
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

    useEffect(() => {
        if (!session || !isE2EEReady) return;

        if (Array.isArray(listTags)) {
            (async () => {
                const normalizedTags = await Promise.all(listTags.map(async (t) => {
                    let name = undefined;
                    let color = undefined;
                    try {
                        if (t?.nameEnc?.ct && t?.nameEnc?.iv) name = await decryptString(dekRef.current, t.nameEnc);
                        if (t?.colorEnc?.ct && t?.colorEnc?.iv) color = await decryptString(dekRef.current, t.colorEnc);
                    } catch {}
                    return { ...t, id: t._id, name, color };
            }));
            setTags(normalizedTags);
            })();
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
                    return n;
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
    }, [session, isE2EEReady, listNotes, listTags]);

    const createNote = useCallback(async (noteData) => {
        if (!session?.user?.id) throw new Error('Not authenticated');
        
        // If offline, queue for background sync
        if (!isOnline()) {
            const queued = await queueForBackgroundSync('create-note', {
                type: 'create-note',
                userId: convexUserId,
                noteData
            });
            
            if (queued) {
                setSyncStatus(prev => ({ ...prev, pending: prev.pending + 1 }));
                // Return a temporary note object for immediate UI update
                return {
                    id: `temp-${Date.now()}`,
                    title: noteData.title,
                    description: noteData.description,
                    content: noteData.content,
                    tags: noteData.tags ?? [],
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                    _temp: true
                };
            }
        }

        // Online: execute normally
        let payload = {
            userId: convexUserId,
            titleEnc: undefined,
            descriptionEnc: undefined,
            contentEnc: undefined,
            tags: noteData.tags ?? [],
        };
        if (e2eeReadyRef.current && dekRef.current) {
            payload.titleEnc = noteData.title ? await encryptString(dekRef.current, noteData.title) : undefined;
            payload.descriptionEnc = noteData.description ? await encryptString(dekRef.current, noteData.description) : undefined;
            payload.contentEnc = noteData.content ? await encryptString(dekRef.current, noteData.content) : undefined;
        }
        const created = await createNoteMutation(payload);
        return {
            ...created,
            id: created?._id,
            tags: Array.isArray(created?.tags) ? created.tags.map((tid) => String(tid)) : [],
        };
    }, [createNoteMutation, session, convexUserId]);

    const deleteNote = useCallback(async (noteId) => {
        // If offline, queue for background sync
        if (!isOnline()) {
            const queued = await queueForBackgroundSync('delete-note', {
                type: 'delete-note',
                noteId
            });
            
            if (queued) {
                setSyncStatus(prev => ({ ...prev, pending: prev.pending + 1 }));
                return; // Return early for offline
            }
        }

        // Online: execute normally
        await deleteNoteMutation({ id: noteId });
    }, [deleteNoteMutation]);

    const updateNote = useCallback(async (noteId, noteData) => {
        // If offline, queue for background sync
        if (!isOnline()) {
            const queued = await queueForBackgroundSync('update-note', {
                type: 'update-note',
                noteId,
                noteData
            });
            
            if (queued) {
                setSyncStatus(prev => ({ ...prev, pending: prev.pending + 1 }));
                // Return updated note for immediate UI update
                return {
                    id: noteId,
                    title: noteData.title,
                    description: noteData.description,
                    content: noteData.content,
                    tags: noteData.tags ?? [],
                    updatedAt: Date.now(),
                    _temp: true
                };
            }
        }

        // Online: execute normally
        let payload = {
            id: noteId,
            titleEnc: undefined,
            descriptionEnc: undefined,
            contentEnc: undefined,
            tags: noteData.tags ?? undefined,
        };
        if (e2eeReadyRef.current && dekRef.current) {
            payload.titleEnc = noteData.title !== undefined ? (noteData.title ? await encryptString(dekRef.current, noteData.title) : undefined) : undefined;
            payload.descriptionEnc = noteData.description !== undefined ? (noteData.description ? await encryptString(dekRef.current, noteData.description) : undefined) : undefined;
            payload.contentEnc = noteData.content !== undefined ? (noteData.content ? await encryptString(dekRef.current, noteData.content) : undefined) : undefined;
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
        const name = tagData.name;
        const color = tagData.color || 'bg-gray-500/20 text-gray-500';
        const nameEnc = name ? await encryptString(dekRef.current, name) : undefined;
        const colorEnc = color ? await encryptString(dekRef.current, color) : undefined;
        const created = await createTagMutation({ userId: convexUserId, nameEnc, colorEnc });
        return { ...created, id: created?._id };
    }, [createTagMutation, session, convexUserId]);

    const updateTag = useCallback(async (tagId, tagData) => {
        const nameEnc = tagData.name !== undefined ? (tagData.name ? await encryptString(dekRef.current, tagData.name) : undefined) : undefined;
        const colorEnc = tagData.color !== undefined ? (tagData.color ? await encryptString(dekRef.current, tagData.color) : undefined) : undefined;
        const updated = await updateTagMutation({ id: tagId, nameEnc, colorEnc });
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
        if (e2eeReadyRef.current && dekRef.current) {
            window.__yotesDek = dekRef.current;
        }
    };

    const handlePassphraseCancel = () => {
        setShowPassphraseModal(false);
    };

    const lockNotes = useCallback(() => {
        dekRef.current = null;
        e2eeReadyRef.current = false;
        setIsE2EEReady(false);
        setNotes([]);
        setTags([]);
        delete window.__yotesDek;
        setShowPassphraseModal(true);
        setIsFirstTimeSetup(false);
        setPassphraseCallback(() => async (passphrase) => {
            const userDoc = await convex.query(api.users.byExternalId, { externalId: session.user.id });
            if (userDoc?.wrappedDekB64 && userDoc?.wrappedDekIvB64 && userDoc?.encSaltB64 && userDoc?.encIterations) {
                const kek = await deriveKekFromPassphrase(passphrase, userDoc.encSaltB64, userDoc.encIterations);
                const dek = await unwrapDek(userDoc.wrappedDekB64, userDoc.wrappedDekIvB64, kek);
                dekRef.current = dek;
                e2eeReadyRef.current = true;
                setIsE2EEReady(true);
                window.__yotesDek = dekRef.current;
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
            hasPendingChanges: syncStatus.pending > 0,
            manualSyncWithDrive: async () => {},
            isManualSyncing: false,
            syncProgressMessage: syncStatus.pending > 0 ? `${syncStatus.pending} items pending sync` : '',
            syncDiscrepancyDetected: false,
            checkSyncDiscrepancies: async () => false,
            isE2EEReady,
            lockNotes,
            syncStatus,
        }}>
            {children}
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