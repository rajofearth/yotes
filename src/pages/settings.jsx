import { useState } from 'react';
import { useSettings } from '../hooks/useSettings';
import { SettingsHeader } from '../components/settings/SettingsHeader';
import { SettingsGrid } from '../components/settings/SettingsGrid';
import { DeleteAccountDialog } from '../components/settings/DeleteAccountDialog';
import { DeleteTagDialog } from '../components/settings/DeleteTagDialog';
import { CreateTagDialog } from '../components/settings/CreateTagDialog';
import { UPIDonationDialog } from '../components/settings/UPIDonationDialog';
import { useNavigate } from 'react-router-dom';

export default function Settings() {
    const {
        user,
        notes,
        tags,
        loading,
        tagState,
        setTagState,
        handleLogout,
        handleDeleteAccount,
        handleTagAction,
        noteActivity,
    } = useSettings();
    const navigate = useNavigate();
    const [dialogs, setDialogs] = useState({
        deleteAccount: false,
        deleteTag: false,
        createTag: false,
        upiDonation: false
    });
    const handleLogoutWithNavigation = async () => {
        await handleLogout();
        navigate('/login');
    };

    const handleDeleteAccountWithNavigation = async () => {
        await handleDeleteAccount();
        navigate('/login');
    };
    return (
        <div className="min-h-screen bg-bg-primary text-text-primary">
            <SettingsHeader loading={loading} navigate={navigate} />
            <SettingsGrid
                user={user}
                notes={notes}
                tags={tags}
                loading={loading}
                dialogs={dialogs}
                setDialogs={setDialogs}
                tagState={tagState}
                setTagState={setTagState}
                handleTagAction={handleTagAction}
                noteActivity={noteActivity}
                handleLogout={handleLogoutWithNavigation}
                handleDeleteAccount={handleDeleteAccountWithNavigation}
            />

            <DeleteAccountDialog
                open={dialogs.deleteAccount}
                onOpenChange={val => setDialogs(prev => ({ ...prev, deleteAccount: val }))}
                loading={loading}
                handleDeleteAccount={handleDeleteAccountWithNavigation}
            />
            <DeleteTagDialog
                open={dialogs.deleteTag}
                onOpenChange={val => setDialogs(prev => ({ ...prev, deleteTag: val }))}
                loading={loading}
                handleTagAction={handleTagAction}
                tagId={tagState.tagToDelete}
            />
            <CreateTagDialog
                open={dialogs.createTag}
                onOpenChange={val => setDialogs(prev => ({ ...prev, createTag: val }))}
                tagState={tagState}
                setTagState={setTagState}
                handleTagAction={handleTagAction}
            />
            <UPIDonationDialog
                open={dialogs.upiDonation}
                onOpenChange={val => setDialogs(prev => ({ ...prev, upiDonation: val }))}
            />
        </div>
    );
}