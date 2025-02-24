import { Button } from '../components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useSettings } from '../hooks/useSettings';
import { StatisticsCard } from '../components/settings/StatisticsCard';
import { AccountDetailsCard } from '../components/settings/AccountDetailsCard';
import { TagManagementCard } from '../components/settings/TagManagementCard';
import { NoteActivityCard } from '../components/settings/NoteActivityCard';
import { AccountActionsCard } from '../components/settings/AccountActionsCard';
import { DeleteAccountDialog } from '../components/settings/DeleteAccountDialog';
import { DeleteTagDialog } from '../components/settings/DeleteTagDialog';
import { CreateTagDialog } from '../components/settings/CreateTagDialog';

export default function Settings() {
  const {
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
  } = useSettings();

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary">
      <header className="border-b border-overlay/10">
        <div className="max-w-[1920px] mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')} disabled={loading.logout || loading.delete}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-xl font-semibold">Settings</h1>
        </div>
      </header>
      <main className="max-w-[1920px] mx-auto px-4 py-8 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <StatisticsCard notes={notes} tags={tags} />
          <AccountDetailsCard user={user} />
          <TagManagementCard tags={tags} tagState={tagState} setTagState={setTagState} setDialogs={setDialogs} handleTagAction={handleTagAction} />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <NoteActivityCard notes={notes} noteActivity={noteActivity} />
          <AccountActionsCard loading={loading} handleLogout={handleLogout} setDialogs={setDialogs} />
        </div>
      </main>
      <DeleteAccountDialog open={dialogs.deleteAccount} onOpenChange={val => setDialogs(prev => ({ ...prev, deleteAccount: val }))} loading={loading} handleDeleteAccount={handleDeleteAccount} />
      <DeleteTagDialog open={dialogs.deleteTag} onOpenChange={val => setDialogs(prev => ({ ...prev, deleteTag: val }))} loading={loading} handleTagAction={handleTagAction} tagId={tagState.tagToDelete} />
      <CreateTagDialog open={dialogs.createTag} onOpenChange={val => setDialogs(prev => ({ ...prev, createTag: val }))} tagState={tagState} setTagState={setTagState} handleTagAction={handleTagAction} />
    </div>
  );
}