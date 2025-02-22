import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../utils/supabaseClient';
import { useNotes } from '../hooks/useNotes';
import { useToast } from '../contexts/ToastContext';
import { Button } from '../components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../components/ui/dialog';
import { ArrowLeft, Trash2, LogOut, Edit, Plus, Save } from 'lucide-react';
import CalendarHeatmap from 'react-calendar-heatmap';
import '../styles/heatmap.css';

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
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [isDeleteTagDialogOpen, setIsDeleteTagDialogOpen] = useState(false);
    const [tagToDelete, setTagToDelete] = useState(null);

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

    const clearCache = () => {
      localStorage.removeItem('notes_cache');
      localStorage.removeItem('notes_cache_timestamp');
      localStorage.removeItem('tags_cache');
      localStorage.removeItem('tags_cache_timestamp'); // Assuming this key, or `${TAGS_CACHE_KEY}_timestamp`
    };

    const handleLogout = async () => {
      setIsLoadingLogout(true);
      try {
        await supabase.auth.signOut();
        clearCache(); // Clear cache on logout
        showToast('Logged out successfully', 'success');
        navigate('/login', { replace: true });
      } catch (error) {
        console.error('Logout error:', error);
        showToast('Failed to log out', 'error');
      } finally {
        setIsLoadingLogout(false);
      }
    };

    const handleDeleteAccount = async () => {
      setIsLoadingDelete(true);
      try {
        await supabase.auth.signOut();
        clearCache(); // Clear cache on account deletion
        showToast('Account deletion requested. Contact support to complete.', 'success');
        navigate('/login', { replace: true });
      } catch (error) {
        console.error('Delete account error:', error);
        showToast('Failed to initiate account deletion', 'error');
      } finally {
        setIsLoadingDelete(false);
        setIsDeleteDialogOpen(false);
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

    const deleteTagHandler = async () => {
        if (!tagToDelete) return;
        try {
            await deleteTag(tagToDelete);
            showToast('Tag deleted successfully', 'success');
        } catch (error) {
            showToast('Failed to delete tag', 'error');
        } finally {
            setIsDeleteTagDialogOpen(false);
            setTagToDelete(null);
        }
    };

    const openDeleteTagDialog = (tagId) => {
        setTagToDelete(tagId);
        setIsDeleteTagDialogOpen(true);
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

    // Calculate note activity for the past year (365 days)
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

        return Object.entries(activity).map(([date, count]) => ({ date, count }));
    };

    const noteActivity = getNoteActivity();

    return (
<div className="min-h-screen bg-bg-primary text-text-primary">
  <header className="border-b border-overlay/10">
    <div className="max-w-[1920px] mx-auto px-4 py-4 flex items-center gap-4">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => navigate('/')}
        disabled={isLoadingLogout || isLoadingDelete}
      >
        <ArrowLeft className="h-4 w-4" />
      </Button>
      <h1 className="text-xl font-semibold">Settings</h1>
    </div>
  </header>
<main className="max-w-[1920px] mx-auto px-4 py-8 space-y-8">
  {/* Group 1: Statistics, Account Details, and Tag Management in three columns on desktop */}
  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
    <Card className="bg-overlay/5 border-overlay/10">
      <CardHeader>
        <CardTitle>Statistics</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-sm text-text-primary/80">
          Total Notes: <span className="font-medium">{notes.length}</span>
        </p>
        <p className="text-sm text-text-primary/80">
          Total Tags: <span className="font-medium">{tags.length}</span>
        </p>
        <p className="text-sm text-text-primary/60 italic">
          Storage usage calculation not yet implemented.
        </p>
      </CardContent>
    </Card>

    <Card className="bg-overlay/5 border-overlay/10">
      <CardHeader>
        <CardTitle>Account Details</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-sm text-text-primary/80">
          Email: <span className="font-medium">{user?.email || 'Loading...'}</span>
        </p>
        <p className="text-sm text-text-primary/80">
          Name: <span className="font-medium">{user?.user_metadata?.name || 'Not set'}</span>
        </p>
        <p className="text-sm text-text-primary/80">
          Joined:{' '}
          <span className="font-medium">
            {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'Loading...'}
          </span>
        </p>
      </CardContent>
    </Card>
    <Card className="bg-overlay/5 border-overlay/10">
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
            className="flex-1 bg-overlay/5 border-overlay/10"
          />
          <Button onClick={createNewTag} className="flex items-center gap-2 bg-overlay/10 hover:bg-overlay/20">
            <Plus className="h-4 w-4" />
            Add Tag
          </Button>
        </div>
        {tags.length > 0 ? (
          <div className="space-y-2">
            {tags.map((tag) => (
              <div key={tag.id} className="flex items-center gap-2">
                {editingTagId === tag.id ? (
                  <>
                    <Input
                      type="text"
                      value={editingTagName}
                      onChange={(e) => setEditingTagName(e.target.value)}
                      className="flex-1 bg-overlay/5 border-overlay/10"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => saveTagEdit(tag.id)}
                      className="bg-overlay/5 hover:bg-overlay/10"
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
                      className="hover:bg-overlay/10"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => openDeleteTagDialog(tag.id)}
                  className="hover:bg-overlay/10"
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
  </div>

  {/* Group 2: Note Activity and Account Actions in a two-column layout on desktop */}
  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
    <Card className="bg-overlay/5 border-overlay/10 lg:col-span-2">
      <CardHeader>
        <CardTitle>Note Activity</CardTitle>
      </CardHeader>
      <CardContent>
          <div className="w-full">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-text-primary/80">
                {notes.length} notes in the last 12 months
              </p>
              <p className="text-sm text-text-primary/80">{new Date().getFullYear()}</p>
            </div>
            <div className="overflow-x-auto">
              <div className="min-w-[600px]">
                <CalendarHeatmap
                  startDate={new Date(new Date().setFullYear(new Date().getFullYear() - 1))}
                  endDate={new Date()}
                  values={noteActivity}
                  classForValue={(value) => {
                    if (!value || value.count === 0) return 'color-empty';
                    if (value.count === 1) return 'color-scale-1';
                    if (value.count === 2) return 'color-scale-2';
                    if (value.count === 3) return 'color-scale-3';
                    return 'color-scale-4'; // 4+ notes
                  }}
                  tooltipDataAttrs={(value) => ({
                    'data-tooltip': value
                      ? `${value.date}: ${value.count} note${value.count === 1 ? '' : 's'}`
                      : 'No notes'
                  })}
                  showWeekdayLabels={true}
                  showMonthLabels={true}
                  horizontal={true}
                  gutterSize={2}
                  titleForValue={(value) =>
                    value ? `${value.date}: ${value.count} note${value.count === 1 ? '' : 's'}` : 'No notes'
                  }
                  monthLabels={[
                    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
                  ]}
                  weekdayLabels={['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']}
                  className="w-full heatmap-container"
                />
              </div>
            </div>
            <div className="mt-2 flex items-center justify-between">
              <p className="text-sm text-text-primary/60">
                Note activity over the past year (darker = more notes)
              </p>
              <div className="flex items-center gap-1">
                <span className="text-sm text-text-primary/60">Less</span>
                <div className="flex gap-1">
                  <span className="w-3 h-3 bg-[#d6e685] rounded-sm"></span>
                  <span className="w-3 h-3 bg-[#8cc665] rounded-sm"></span>
                  <span className="w-3 h-3 bg-[#44a340] rounded-sm"></span>
                  <span className="w-3 h-3 bg-[#1e6823] rounded-sm"></span>
                </div>
                <span className="text-sm text-text-primary/60">More</span>
              </div>
            </div>
          </div>
      </CardContent>

    </Card>

    <Card className="bg-overlay/5 border-overlay/10">
      <CardHeader>
        <CardTitle>Account Actions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-text-primary/80">
          Manage your account settings below. You can log out or delete your account permanently.
        </p>
        <Button
          variant="outline"
          onClick={handleLogout}
          disabled={isLoadingLogout || isLoadingDelete}
          className="w-full flex items-center justify-center gap-2 bg-overlay/5 hover:bg-overlay/10"
        >
          <LogOut className="h-4 w-4" />
          {isLoadingLogout ? 'Logging out...' : 'Logout'}
        </Button>
        <Button
          variant="destructive"
          onClick={() => setIsDeleteDialogOpen(true)}
          disabled={isLoadingLogout || isLoadingDelete}
          className="w-full flex items-center justify-center gap-2 bg-red-500 text-white hover:text-white"
        >
          <Trash2 className="h-4 w-4" />
          {isLoadingDelete ? 'Processing...' : 'Delete Account'}
        </Button>
      </CardContent>
    </Card>
  </div>
</main>

  {/* Delete Account Dialog */}
  <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
    <DialogContent className="bg-bg-primary border-overlay/10 shadow-lg">
      <DialogHeader>
        <DialogTitle className="text-xl font-semibold text-text-primary">
          Confirm Account Deletion
        </DialogTitle>
        <DialogDescription className="text-text-primary/60">
          Are you sure you want to delete your account? This action cannot be undone.
        </DialogDescription>
      </DialogHeader>
      <DialogFooter className="flex flex-col sm:flex-row justify-end gap-4">
        <Button
          variant="outline"
          onClick={() => setIsDeleteDialogOpen(false)}
          className="bg-overlay/5 hover:bg-overlay/10 w-full sm:w-32"
        >
          Cancel
        </Button>
        <Button
          variant="destructive"
          className="bg-red-500 text-white w-full sm:w-32"
          onClick={handleDeleteAccount}
          disabled={isLoadingDelete}
        >
          {isLoadingDelete ? 'Deleting...' : 'Delete'}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>

  {/* Delete Tag Dialog */}
  <Dialog open={isDeleteTagDialogOpen} onOpenChange={setIsDeleteTagDialogOpen}>
    <DialogContent className="bg-bg-primary border-overlay/10 shadow-lg">
      <DialogHeader>
        <DialogTitle className="text-xl font-semibold text-text-primary">
          Confirm Tag Deletion
        </DialogTitle>
        <DialogDescription className="text-text-primary/60">
          Are you sure you want to delete this tag? It will be removed from all notes.
        </DialogDescription>
      </DialogHeader>
      <DialogFooter>
        <Button
          variant="outline"
          onClick={() => setIsDeleteTagDialogOpen(false)}
          className="bg-overlay/5 hover:bg-overlay/10"
        >
          Cancel
        </Button>
        <Button variant="destructive" onClick={deleteTagHandler}>
          Delete
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</div>

    );
}