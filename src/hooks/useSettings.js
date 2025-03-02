// src/hooks/useSettings.js
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../utils/supabaseClient';
import { useNotes } from './useNotes';
import { useToast } from '../contexts/ToastContext';

export const useSettings = () => {
  const navigate = useNavigate();
  const { notes, tags, createTag, updateTag, deleteTag } = useNotes();
  const showToast = useToast();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState({ logout: false, delete: false, tagDelete: false });
  const [dialogs, setDialogs] = useState({
    deleteAccount: false,
    deleteTag: false,
    createTag: false,
    upiDonation: false
  });
  const [tagState, setTagState] = useState({
    newName: '',
    newColor: 'bg-purple-600/20 text-purple-600', // Default color
    editingId: null,
    editingName: '',
    editingColor: '',
    tagToDelete: null
  });

  const [noteActivity, setNoteActivity] = useState([]);

  useEffect(() => {
    const fetchUser = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error) console.error('Error fetching user:', error);
      else setUser(data.user);
    };
    fetchUser();

    // Calculate note activity for heatmap
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
    if (error) showToast('Failed to log out', 'error');
    setLoading(prev => ({ ...prev, logout: false }));
    navigate('/login');
  };

  const handleDeleteAccount = async () => {
    setLoading(prev => ({ ...prev, delete: true }));
    // Add account deletion logic if implemented
    await supabase.auth.signOut();
    setLoading(prev => ({ ...prev, delete: false }));
    navigate('/login');
  };

  const handleTagAction = async (action, data) => {
    try {
      if (action === 'create') {
        if (!data || !data.name) throw new Error('Tag name is required');
        await createTag({
          name: data.name,
          color: data.color || 'bg-gray-500/20 text-gray-500' // Fallback
        });
        setTagState(prev => ({ ...prev, newName: '', newColor: 'bg-purple-600/20 text-purple-600' }));
        setDialogs(prev => ({ ...prev, createTag: false }));
        showToast('Tag created successfully', 'success');
      } else if (action === 'update') {
        if (!data || !data.id || !data.name) throw new Error('Invalid tag data');
        await updateTag(data.id, {
          name: data.name,
          color: data.color || 'bg-gray-500/20 text-gray-500' // Fallback
        });
        setTagState(prev => ({ ...prev, editingId: null, editingName: '', editingColor: '' }));
        showToast('Tag updated successfully', 'success');
      } else if (action === 'delete') {
        if (!data) throw new Error('Tag ID is required');
        setLoading(prev => ({ ...prev, tagDelete: true }));
        await deleteTag(data);
        setTagState(prev => ({ ...prev, tagToDelete: null }));
        setDialogs(prev => ({ ...prev, deleteTag: false }));
        setLoading(prev => ({ ...prev, tagDelete: false }));
        showToast('Tag deleted successfully', 'success');
      }
    } catch (error) {
      showToast(`Failed to ${action} tag: ${error.message}`, 'error');
    }
  };

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
    noteActivity
  };
};