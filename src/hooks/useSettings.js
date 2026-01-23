import { useState, useEffect, useCallback } from 'react';
import { useNotes } from './useNotes';
import { useToast } from '../contexts/ToastContext';
import { getFromDB, setInDB, clearDB } from '../utils/indexedDB';
import { useOnlineStatus } from '../contexts/OnlineStatusContext';
import { useAISettings } from './useAISettings';
import { authClient } from '../lib/auth-client';

export const useSettings = () => {
    const showToast = useToast();
    const isOnline = useOnlineStatus();
    const { notes, tags, createTag, updateTag, deleteTag } = useNotes();
    const { 
        aiSettings, 
        loading: aiLoading, 
        error: aiError, 
        toggleAiFeatures, 
        saveApiKey, 
        refreshAISettings 
    } = useAISettings();
    const sessionState = authClient.useSession();
    const session = sessionState.data ?? null;
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState({ logout: false, delete: false, tagDelete: false, user: true, ai: false });
    const [tagState, setTagState] = useState({ newName: '', newColor: 'bg-purple-600/20 text-purple-600', editingId: null, editingName: '', editingColor: '', tagToDelete: null });
    const [noteActivity, setNoteActivity] = useState([]);

    const signOutAndClear = useCallback(async () => {
        showToast('Session expired or invalid. Signing out.', 'error');
        try { await authClient.signOut(); await clearDB(); }
        catch (e) { console.error("Error during sign out and clear:", e); }
    }, [showToast]);

    useEffect(() => {
        let isMounted = true;
        const fetchUser = async () => {
            if (!isMounted) return;
            setLoading(prev => ({ ...prev, user: true }));
            let cachedUser = null; let cachedSession = null;
            try {
                 cachedSession = await getFromDB('sessions', 'session');
                 if (cachedSession?.user) { cachedUser = cachedSession.user; if (isMounted) setUser(cachedUser); }
                 if (isOnline && session?.user) {
                     if (isMounted) setUser(session.user);
                     if (cachedSession && JSON.stringify(session.user) !== JSON.stringify(cachedUser)) {
                         await setInDB('sessions', 'session', { ...cachedSession, user: session.user });
                     }
                 } else if (!cachedUser && isMounted) {
                     setUser(null);
                 }
            } catch (error) {
                 console.error('useSettings: Error fetching user:', error.message);
                 if (isMounted) {
                      if (sessionState.error) { await signOutAndClear(); }
                      else if (!cachedUser) { setUser(null); } // Only nullify if no cache fallback
                      showToast('Could not verify user details.', 'error');
                 }
            } finally { if (isMounted) setLoading(prev => ({ ...prev, user: false })); }
        };
        fetchUser();
        return () => { isMounted = false; };
    }, [isOnline, showToast, signOutAndClear, session, sessionState.error]);

    useEffect(() => {
        const activity = notes.map(note => ({ date: new Date(note.createdAt).toISOString().split('T')[0], count: 1 }))
                           .reduce((acc, curr) => { const e = acc.find(i => i.date === curr.date); if (e) e.count++; else acc.push(curr); return acc; }, []);
        setNoteActivity(activity);
    }, [notes]);

    const handleLogout = async () => {
        if (!isOnline) { showToast('Cannot log out while offline.', 'error'); return; }
        setLoading(prev => ({ ...prev, logout: true })); let success = false;
        try { 
            // Delete IndexedDB first
            await clearDB().catch(e => console.error("Clear DB error on logout:", e));
            const { error } = await authClient.signOut();
            if (error) throw error;
            success = true; 
        }
        catch(error) { showToast('Failed to log out', 'error'); console.error("Logout error:", error); }
        if(success) {
            showToast('Logged out successfully.', 'success');
        }
        setLoading(prev => ({ ...prev, logout: false }));
        // App handles redirect
    };

    const handleDeleteAccount = async () => {
        if (!isOnline) { showToast('Cannot delete account while offline.', 'error'); return; }
        showToast('Account deletion not implemented yet.', 'info');
    };

    const handleTagAction = useCallback(async (action, data) => {
        const isDelete = action === 'delete';
        setLoading(prev => ({ ...prev, tagDelete: isDelete }));
        try {
            if (action === 'create') {
                if (!data || !data.name) throw new Error('Tag name is required');
                await createTag({ name: data.name, color: data.color || 'bg-gray-500/20 text-gray-500' });
                setTagState(prev => ({ ...prev, newName: '', newColor: 'bg-purple-600/20 text-purple-600' }));
                showToast('Tag created successfully', 'success');
            } else if (action === 'update') {
                if (!data || !data.id || !data.name) throw new Error('Invalid tag data');
                await updateTag(data.id, { name: data.name, color: data.color || 'bg-gray-500/20 text-gray-500' });
                setTagState(prev => ({ ...prev, editingId: null, editingName: '', editingColor: '' }));
                showToast('Tag updated successfully', 'success');
            } else if (isDelete) {
                if (!data) throw new Error('Tag ID is required');
                await deleteTag(data); // data is the tagId
                setTagState(prev => ({ ...prev, tagToDelete: null }));
                showToast('Tag deleted successfully', 'success');
            }
        } catch (error) { console.error(`Failed to ${action} tag:`, error); showToast(`Failed to ${action} tag: ${error.message}`, 'error');
        } finally { if (isDelete) setLoading(prev => ({ ...prev, tagDelete: false })); }
    }, [createTag, updateTag, deleteTag, showToast]);

    // Handle AI features toggle
    const handleToggleAiFeatures = useCallback(async (enabled) => {
        setLoading(prev => ({ ...prev, ai: true }));
        try {
            await toggleAiFeatures(enabled);
            showToast(`AI features ${enabled ? 'enabled' : 'disabled'} successfully`, 'success');
            
            // If enabling but no API key, show info toast
            if (enabled && !aiSettings.apiKey) {
                showToast('Please add your Google Gemini API key to use AI features', 'info');
            }
        } catch (error) {
            console.error('Failed to toggle AI features:', error);
            showToast(`Failed to toggle AI features: ${error.message}`, 'error');
        } finally {
            setLoading(prev => ({ ...prev, ai: false }));
        }
    }, [toggleAiFeatures, aiSettings, showToast]);

    // Handle API key saving
    const handleSaveApiKey = useCallback(async (apiKey) => {
        setLoading(prev => ({ ...prev, ai: true }));
        try {
            await saveApiKey(apiKey);
            return true;
        } catch (error) {
            console.error('Failed to save API key:', error);
            throw new Error(error.message || 'Failed to save API key');
        } finally {
            setLoading(prev => ({ ...prev, ai: false }));
        }
    }, [saveApiKey]);

    return {
        user, 
        notes, 
        tags, 
        loading: { ...loading, ai: aiLoading }, 
        tagState, 
        setTagState, 
        handleLogout, 
        handleDeleteAccount, 
        handleTagAction, 
        noteActivity,
        // AI settings
        aiSettings,
        handleSaveApiKey,
        handleToggleAiFeatures
    };
};