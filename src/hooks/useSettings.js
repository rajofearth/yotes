import { useState, useEffect, useCallback } from 'react'; 
import { useNavigate } from 'react-router-dom';
import { supabase } from '../utils/supabaseClient';
import { useNotes } from './useNotes'; 
import { useToast } from '../contexts/ToastContext';
import { clearDB } from '../utils/indexedDB'; 

// Helper to find Supabase localStorage key
const findSupabaseLocalStorageKey = () => {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('sb-') && key.endsWith('-auth-token')) return key;
    }
    return null;
};


export const useSettings = () => {
    const showToast = useToast();
    const navigate = useNavigate(); // Use navigate for redirects
    // Assuming useNotes provides necessary CRUD for tags and access to notes list
    // If useNotes isn't stable or causes re-renders, consider using NotesContext directly
    const { notes, tags, createTag, updateTag, deleteTag } = useNotes();
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState({ logout: false, delete: false, tagDelete: false, user: true }); // Added user loading state
    const [tagState, setTagState] = useState({
        newName: '', newColor: 'bg-purple-600/20 text-purple-600',
        editingId: null, editingName: '', editingColor: '', tagToDelete: null
    });
    const [noteActivity, setNoteActivity] = useState([]);

    const signOutAndClear = useCallback(async () => {
        showToast('Session expired or invalid. Signing out.', 'error');
        await supabase.auth.signOut().catch(e => console.error("Sign out error", e));
        await clearDB().catch(e => console.error("Clear DB error", e));
        const key = findSupabaseLocalStorageKey();
        if (key && typeof window !== 'undefined') localStorage.removeItem(key);
        // No navigate here, App.jsx should handle redirect based on null session
    }, [showToast]);


    // Fetch user data, handling expired tokens
    useEffect(() => {
        let isMounted = true;
        const fetchUser = async () => {
            if (!isMounted) return;
            setLoading(prev => ({ ...prev, user: true }));
            try {
                // First attempt to get user
                const { data, error } = await supabase.auth.getUser();

                if (error) {
                    // Check if error is due to expired token
                    if (error.message.includes('token is expired') || error.status === 401 || error.status === 403) {
                        console.warn('Supabase token expired, attempting refresh...');
                        showToast('Refreshing session...', 'info');
                        const { error: refreshError } = await supabase.auth.refreshSession();

                        if (refreshError) {
                            console.error('Supabase refresh failed:', refreshError);
                            throw new Error('Session refresh failed'); // Propagate to outer catch
                        } else {
                            console.log('Supabase session refreshed, retrying getUser...');
                            // Retry getting user after successful refresh
                            const { data: retryData, error: retryError } = await supabase.auth.getUser();
                            if (retryError) {
                                console.error('Error fetching user after refresh:', retryError);
                                throw new Error('Failed to fetch user after refresh'); // Propagate
                            }
                            if (isMounted) setUser(retryData.user);
                        }
                    } else {
                        // Handle other errors
                        console.error('Error fetching user:', error);
                        throw error; // Propagate other errors
                    }
                } else {
                    // Success on first attempt
                    if (isMounted) setUser(data.user);
                }
            } catch (error) {
                console.error('Final error in fetchUser:', error.message);
                 // If refresh failed or subsequent getUser failed, sign out
                 if (error.message.includes('Session refresh failed') || error.message.includes('Failed to fetch user after refresh')) {
                    if (isMounted) await signOutAndClear();
                 } else {
                    // Show generic error for other issues
                    if (isMounted) showToast('Could not load user details.', 'error');
                 }
                 if (isMounted) setUser(null); // Ensure user state is null on error
            } finally {
                if (isMounted) setLoading(prev => ({ ...prev, user: false }));
            }
        };

        fetchUser();
        return () => { isMounted = false; };
    }, [showToast, signOutAndClear]); // Added signOutAndClear dependency


    // Calculate note activity (depends on notes, which comes from useNotes)
    useEffect(() => {
        const activity = notes.map(note => ({
            date: new Date(note.createdAt).toISOString().split('T')[0],
            count: 1
        })).reduce((acc, curr) => {
            const existing = acc.find(item => item.date === curr.date);
            if (existing) existing.count += 1;
            else acc.push(curr);
            return acc;
        }, []);
        setNoteActivity(activity);
    }, [notes]);


    const handleLogout = async () => {
        setLoading(prev => ({ ...prev, logout: true }));
        const { error } = await supabase.auth.signOut();
        if (error) {
            showToast('Failed to log out', 'error');
            console.error("Logout error:", error);
        } else {
            showToast('Logged out successfully.', 'success');
            await clearDB().catch(e => console.error("Clear DB error on logout:", e)); // Clear local data on logout
             const key = findSupabaseLocalStorageKey();
             if (key && typeof window !== 'undefined') localStorage.removeItem(key);
        }
        // No navigate needed here, App.jsx handles redirect based on session state change
        setLoading(prev => ({ ...prev, logout: false }));
    };


    // Delete Account - Placeholder, needs actual implementation if desired
    const handleDeleteAccount = async () => {
        showToast('Account deletion not implemented yet.', 'info');
    };


    // Tag actions now rely on the stable functions from useNotes
    const handleTagAction = useCallback(async (action, data) => {
        setLoading(prev => ({ ...prev, tagDelete: action === 'delete' })); // Set loading only for delete
        try {
            if (action === 'create') {
                if (!data || !data.name) throw new Error('Tag name is required');
                await createTag({ name: data.name, color: data.color || 'bg-gray-500/20 text-gray-500' });
                setTagState(prev => ({ ...prev, newName: '', newColor: 'bg-purple-600/20 text-purple-600' })); // Reset form state
                showToast('Tag created successfully', 'success');
            } else if (action === 'update') {
                if (!data || !data.id || !data.name) throw new Error('Invalid tag data');
                await updateTag(data.id, { name: data.name, color: data.color || 'bg-gray-500/20 text-gray-500' });
                setTagState(prev => ({ ...prev, editingId: null, editingName: '', editingColor: '' })); // Reset form state
                showToast('Tag updated successfully', 'success');
            } else if (action === 'delete') {
                if (!data) throw new Error('Tag ID is required');
                await deleteTag(data); // data is the tagId here
                setTagState(prev => ({ ...prev, tagToDelete: null }));
                showToast('Tag deleted successfully', 'success');
            }
        } catch (error) {
            console.error(`Failed to ${action} tag:`, error);
            showToast(`Failed to ${action} tag: ${error.message}`, 'error');
        } finally {
             if (action === 'delete') {
                 setLoading(prev => ({ ...prev, tagDelete: false }));
             }
        }
    }, [createTag, updateTag, deleteTag, showToast]); // Add dependencies


    return {
        user,
        notes, // Be mindful of potential re-renders if notes list is large/changes often
        tags,
        loading,
        tagState,
        setTagState,
        handleLogout,
        handleDeleteAccount,
        handleTagAction,
        noteActivity
    };
};