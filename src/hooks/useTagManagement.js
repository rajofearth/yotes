import { useState } from 'react';
import { useToast } from '../contexts/ToastContext';

export const useTagManagement = ({ tags, createTag, updateTag, deleteTag }) => {
    const showToast = useToast();
    const [tagState, setTagState] = useState({
        newName: '',
        newColor: 'bg-purple-600/20 text-purple-600',
        editingId: null,
        editingName: '',
        editingColor: '',
        tagToDelete: null,
    });
    const [dialogs, setDialogs] = useState({
        createTag: false,
        deleteTag: false,
    });

    const handleTagAction = async (action, data) => {
        try {
            if (action === 'create') {
                if (!data || !data.name) throw new Error('Tag name is required');
                const newTag = await createTag({
                    name: data.name,
                    color: data.color || 'bg-gray-500/20 text-gray-500',
                });
                setTagState(prev => ({
                    ...prev,
                    newName: '',
                    newColor: 'bg-purple-600/20 text-purple-600',
                }));
                setDialogs(prev => ({ ...prev, createTag: false }));
                showToast('Tag created successfully', 'success');
            } else if (action === 'update') {
                if (!data || !data.id || !data.name) throw new Error('Invalid tag data');
                await updateTag(data.id, {
                    name: data.name,
                    color: data.color || 'bg-gray-500/20 text-gray-500',
                });
                setTagState(prev => ({
                    ...prev,
                    editingId: null,
                    editingName: '',
                    editingColor: '',
                }));
                showToast('Tag updated successfully', 'success');
            } else if (action === 'delete') {
                if (!data) throw new Error('Tag ID is required');
                await deleteTag(data);
                setTagState(prev => ({ ...prev, tagToDelete: null }));
                setDialogs(prev => ({ ...prev, deleteTag: false }));
                showToast('Tag deleted successfully', 'success');
            }
        } catch (error) {
            showToast(`Failed to ${action} tag: ${error.message}`, 'error');
        }
    };

    return { tagState, setTagState, dialogs, setDialogs, handleTagAction };
};