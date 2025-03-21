// src/components/settings/SettingsGrid.jsx
import React from 'react';
import { StatisticsCard } from './StatisticsCard';
import { AccountDetailsCard } from './AccountDetailsCard';
import { TagManagementCard } from './TagManagementCard';
import { NoteActivityCard } from './NoteActivityCard';
import { AccountActionsCard } from './AccountActionsCard';
import { DonationCard } from './DonationCard';

export const SettingsGrid = ({ user, notes, tags, loading, dialogs, setDialogs, tagState, setTagState, handleTagAction, noteActivity, handleLogout, handleDeleteAccount }) => {
    return (
        <main className="max-w-[1920px] mx-auto px-4 py-8 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <StatisticsCard notes={notes} tags={tags} />
                <AccountDetailsCard user={user} />
                <TagManagementCard
                    tags={tags}
                    tagState={tagState}
                    setTagState={setTagState}
                    setDialogs={setDialogs}
                    handleTagAction={handleTagAction}
                />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <NoteActivityCard notes={notes} noteActivity={noteActivity} />
                {/* Add Donation Section */}
                <div className="grid grid-cols-1 gap-8">
                    <DonationCard setDialogs={setDialogs} />
                </div>
                <AccountActionsCard
                    loading={loading}
                    handleLogout={handleLogout} // I will handle this later
                    handleDeleteAccount={handleDeleteAccount}
                    setDialogs={setDialogs}
                />
            </div>
        </main>
    );
};