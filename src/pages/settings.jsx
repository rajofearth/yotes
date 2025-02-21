import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../utils/supabaseClient';
import { useNotes } from '../hooks/useNotes';
import { useToast } from '../contexts/ToastContext';
import { Button } from '../components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { ArrowLeft, Trash2, LogOut, Edit, Plus, Save } from 'lucide-react';

export default function Settings() {
    const navigate = useNavigate();
    const { notes, tags, createTag, updateTag, deleteTag } = useNotes();
    const showToast = useToast();
    const [user, setUser] = useState(null);
    const [isLoadingLogout, setIsLoadingLogout] = useState(false);
    const [isLoadingDelete, setIsLoadingDelete] = useState(false);
    const [editingTagId, setEditingTagId] = useState(null);
    const [editingTagName, setEditingTagName] = useState('');
    const [newTagName, setNewTagName] = useState('');

    useEffect(() => {
        supabase.auth.getUser().then(({ data, error }) => {
            if (error) {
                console.error('Error fetching user:', error);
                showToast('Failed to load user data', 'error');
            } else {
                setUser(data.user);
            }
        });
    }, [showToast]);

    const handleDeleteAccount = async () => {
        if (window.confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
            setIsLoadingDelete(true);
            try {
                await supabase.auth.signOut();
                showToast('Account deletion requested. Contact support to complete.', 'success');
                navigate('/login', { replace: true });
            } catch (error) {
                console.error('Delete account error:', error);
                showToast('Failed to initiate account deletion', 'error');
            } finally {
                setIsLoadingDelete(false);
            }
        }
    };

    const handleLogout = async () => {
        setIsLoadingLogout(true);
        try {
            await supabase.auth.signOut();
            showToast('Logged out successfully', 'success');
            navigate('/login', { replace: true });
        } catch (error) {
            console.error('Logout error:', error);
            showToast('Failed to log out', 'error');
        } finally {
            setIsLoadingLogout(false);
        }
    };

    const startEditingTag = (tag) => {
        setEditingTagId(tag.id);
        setEditingTagName(tag.name);
    };

    const saveTagEdit = async (tagId) => {
        if (!editingTagName.trim()) {
            showToast('Tag name cannot be empty', 'error');
            return;
        }
        try {
            await updateTag(tagId, { name: editingTagName });
            showToast('Tag updated successfully', 'success');
            setEditingTagId(null);
            setEditingTagName('');
        } catch (error) {
            showToast('Failed to update tag', 'error');
        }
    };

    const deleteTagHandler = async (tagId) => {
        if (window.confirm('Are you sure you want to delete this tag? It will be removed from all notes.')) {
            try {
                await deleteTag(tagId);
                showToast('Tag deleted successfully', 'success');
            } catch (error) {
                showToast('Failed to delete tag', 'error');
            }
        }
    };

    const createNewTag = async () => {
        if (!newTagName.trim()) {
            showToast('Tag name cannot be empty', 'error');
            return;
        }
        try {
            await createTag({ name: newTagName });
            showToast('Tag created successfully', 'success');
            setNewTagName('');
        } catch (error) {
            showToast('Failed to create tag', 'error');
        }
    };

    // Calculate note activity for the past year
    const getNoteActivity = () => {
        const today = new Date();
        const oneYearAgo = new Date(today);
        oneYearAgo.setFullYear(today.getFullYear() - 1);
        
        const activity = {};
        notes.forEach(note => {
            const createdAt = new Date(note.createdAt);
            if (createdAt >= oneYearAgo) {
                const dateKey = createdAt.toISOString().split('T')[0];
                activity[dateKey] = (activity[dateKey] || 0) + 1;
            }
        });

        const days = [];
        for (let d = new Date(oneYearAgo); d <= today; d.setDate(d.getDate() + 1)) {
            const dateKey = d.toISOString().split('T')[0];
            days.push({ date: dateKey, count: activity[dateKey] || 0 });
        }
        return days;
    };

    const noteActivity = getNoteActivity();

    return (
        <div className="min-h-screen bg-bg-primary">
            <header className="border-b border-overlay/10">
                <div className="max-w-[1920px] mx-auto px-4 py-4 flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => navigate('/')} disabled={isLoadingLogout || isLoadingDelete}>
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <h1 className="text-xl font-semibold">Settings</h1>
                </div>
            </header>
            <main className="max-w-[1920px] mx-auto px-4 py-8 space-y-8">
                <Card>
                    <CardHeader>
                        <CardTitle>Statistics</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <p className="text-sm text-text-primary/80">Total Notes: <span className="font-medium">{notes.length}</span></p>
                        <p className="text-sm text-text-primary/80">Total Tags: <span className="font-medium">{tags.length}</span></p>
                        <p className="text-sm text-text-primary/60 italic">Storage usage calculation not yet implemented.</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Account Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <p className="text-sm text-text-primary/80">Email: <span className="font-medium">{user?.email || 'Loading...'}</span></p>
                        <p className="text-sm text-text-primary/80">Name: <span className="font-medium">{user?.user_metadata?.name || 'Not set'}</span></p>
                        <p className="text-sm text-text-primary/80">Joined: <span className="font-medium">{user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'Loading...'}</span></p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Tag Management</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center gap-2">
                            <Input
                                type="text"
                                placeholder="New tag name"
                                value={newTagName}
                                onChange={(e) => setNewTagName(e.target.value)}
                                className="flex-1"
                            />
                            <Button onClick={createNewTag} className="flex items-center gap-2">
                                <Plus className="h-4 w-4" />
                                Add Tag
                            </Button>
                        </div>
                        {tags.length > 0 ? (
                            <div className="space-y-2">
                                {tags.map(tag => (
                                    <div key={tag.id} className="flex items-center gap-2">
                                        {editingTagId === tag.id ? (
                                            <>
                                                <Input
                                                    type="text"
                                                    value={editingTagName}
                                                    onChange={(e) => setEditingTagName(e.target.value)}
                                                    className="flex-1"
                                                />
                                                <Button
                                                    variant="outline"
                                                    size="icon"
                                                    onClick={() => saveTagEdit(tag.id)}
                                                >
                                                    <Save className="h-4 w-4" />
                                                </Button>
                                            </>
                                        ) : (
                                            <>
                                                <span className="flex-1 text-sm text-text-primary/80">{tag.name}</span>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => startEditingTag(tag)}
                                                >
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                            </>
                                        )}
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => deleteTagHandler(tag.id)}
                                        >
                                            <Trash2 className="h-4 w-4 text-red-500" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-text-primary/60">No tags created yet.</p>
                        )}
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Note Activity</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-7 gap-1 max-w-full overflow-x-auto">
                            {noteActivity.map(({ date, count }) => (
                                <div
                                    key={date}
                                    className={`w-4 h-4 rounded-sm ${count > 0 ? `bg-green-${Math.min(count * 100, 500)}` : 'bg-gray-200'}`}
                                    title={`${date}: ${count} note${count === 1 ? '' : 's'}`}
                                />
                            ))}
                        </div>
                        <p className="text-sm text-text-primary/60 mt-2">Note activity over the past year (darker = more notes).</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Account Actions</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Button 
                            variant="outline" 
                            onClick={handleLogout} 
                            disabled={isLoadingLogout || isLoadingDelete}
                            className="w-full flex items-center justify-center gap-2"
                        >
                            <LogOut className="h-4 w-4" />
                            {isLoadingLogout ? 'Logging out...' : 'Logout'}
                        </Button>
                        <Button 
                            variant="destructive" 
                            onClick={handleDeleteAccount} 
                            disabled={isLoadingLogout || isLoadingDelete}
                            className="w-full flex items-center justify-center gap-2"
                        >
                            <Trash2 className="h-4 w-4" />
                            {isLoadingDelete ? 'Processing...' : 'Delete Account'}
                        </Button>
                    </CardContent>
                </Card>
            </main>
        </div>
    );
}