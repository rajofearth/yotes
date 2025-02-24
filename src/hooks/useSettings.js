// src/hooks/useSettings.js
import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../utils/supabaseClient';
import { useNotes } from './useNotes';
import { useToast } from '../contexts/ToastContext';
import { deleteDB } from '../utils/indexedDB';

export const useSettings = () => {
  const navigate = useNavigate();
  const { notes, tags, createTag, updateTag, deleteTag } = useNotes();
  const showToast = useToast();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState({ logout: false, delete: false, tagDelete: false });
  const [dialogs, setDialogs] = useState({ deleteAccount: false, deleteTag: false, createTag: false });
  const [tagState, setTagState] = useState({ editingId: null, editingName: '', newName: '', tagToDelete: null });

  useEffect(() => {
    supabase.auth.getUser().then(({ data, error }) => {
      if (error) showToast('Failed to load user data', 'error');
      else setUser(data.user);
    });
  }, [showToast]);

  const handleLogout = async () => {
    setLoading(prev => ({ ...prev, logout: true }));
    try {
      await supabase.auth.signOut();
      try {
        await deleteDB();
      } catch (error) {
        if (error.message === 'Database deletion blocked after retry') {
          showToast('Logout successful, but local data cleanup delayed. Close all tabs to complete.', 'warning');
        } else {
          throw error;
        }
      }
      showToast('Logged out successfully', 'success');
      navigate('/login', { replace: true });
    } catch (error) {
      console.error('Logout error:', error);
      showToast(`Failed to log out: ${error.message}`, 'error');
    } finally {
      setLoading(prev => ({ ...prev, logout: false }));
    }
  };

  const handleDeleteAccount = async () => {
    setLoading(prev => ({ ...prev, delete: true }));
    try {
      await supabase.auth.signOut();
      try {
        await deleteDB();
      } catch (error) {
        if (error.message === 'Database deletion blocked after retry') {
          showToast('Account deletion requested, but local data cleanup delayed. Close all tabs to complete.', 'warning');
        } else {
          throw error;
        }
      }
      showToast('Account deletion requested. Contact support.', 'success');
      navigate('/login', { replace: true });
    } catch (error) {
      showToast(`Failed to initiate account deletion: ${error.message}`, 'error');
    } finally {
      setLoading(prev => ({ ...prev, delete: false }));
      setDialogs(prev => ({ ...prev, deleteAccount: false }));
    }
  };

  const handleTagAction = async (action, payload) => {
    try {
      if (action === 'create') {
        if (!payload.trim()) throw new Error('Tag name cannot be empty');
        await createTag({ name: payload });
        setTagState(prev => ({ ...prev, newName: '' }));
        showToast('Tag created successfully', 'success');
      } else if (action === 'update') {
        if (!payload.name.trim()) throw new Error('Tag name cannot be empty');
        await updateTag(payload.id, { name: payload.name });
        setTagState(prev => ({ ...prev, editingId: null, editingName: '' }));
        showToast('Tag updated successfully', 'success');
      } else if (action === 'delete') {
        setLoading(prev => ({ ...prev, tagDelete: true }));
        await deleteTag(payload);
        showToast('Tag deleted successfully', 'success');
      }
    } catch (error) {
      showToast(error.message || 'Failed to process tag action', 'error');
    } finally {
      setLoading(prev => ({ ...prev, tagDelete: false }));
      setDialogs(prev => ({ ...prev, deleteTag: false }));
      if (action === 'delete') setTagState(prev => ({ ...prev, tagToDelete: null }));
    }
  };

  const getNoteActivity = useMemo(() => {
    const today = new Date();
    const oneYearAgo = new Date(today.setFullYear(today.getFullYear() - 1));
    const activity = new Map();
    notes.forEach(note => {
      const date = new Date(note.createdAt);
      if (date >= oneYearAgo) {
        const key = date.toISOString().split('T')[0];
        activity.set(key, (activity.get(key) || 0) + 1);
      }
    });
    return Array.from(activity, ([date, count]) => ({ date, count }));
  }, [notes]);

  return {
    user,
    notes,
    tags,
    loading,
    dialogs,
    tagState,
    navigate,
    setDialogs,
    setTagState,
    handleLogout,
    handleDeleteAccount,
    handleTagAction,
    noteActivity: getNoteActivity
  };
};