import { useState, useEffect, useMemo } from 'react';
import { useSettings } from '../hooks/useSettings';
import { SettingsHeader } from '../components/settings/SettingsHeader';
import { DeleteAccountDialog } from '../components/settings/DeleteAccountDialog';
import { DeleteTagDialog } from '../components/settings/DeleteTagDialog';
import { CreateTagDialog } from '../components/settings/CreateTagDialog';
import { UPIDonationDialog } from '../components/settings/UPIDonationDialog';
import { useNavigate } from 'react-router-dom';
import { TagManagementCard } from '../components/settings/TagManagementCard';
import { StatisticsCard } from '../components/settings/StatisticsCard';
import { AccountDetailsCard } from '../components/settings/AccountDetailsCard';
import { NoteActivityCard } from '../components/settings/NoteActivityCard';
import { DonationCard } from '../components/settings/DonationCard';
import { AccountActionsCard } from '../components/settings/AccountActionsCard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Settings as SettingsIcon, User, Tag, BarChart, Heart, Shield } from 'lucide-react';

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
    const [activeTab, setActiveTab] = useState("account");
    const [isMobile, setIsMobile] = useState(false);
    const [dialogs, setDialogs] = useState({
        deleteAccount: false,
        deleteTag: false,
        createTag: false,
        upiDonation: false
    });
    
    // Detect mobile screens
    useEffect(() => {
        const checkIfMobile = () => {
            setIsMobile(window.innerWidth < 768);
        };
        
        checkIfMobile();
        window.addEventListener('resize', checkIfMobile);
        
        return () => {
            window.removeEventListener('resize', checkIfMobile);
        };
    }, []);
    
    const handleLogoutWithNavigation = async () => {
        await handleLogout();
        navigate('/login');
    };

    const handleDeleteAccountWithNavigation = async () => {
        await handleDeleteAccount();
        navigate('/login');
    };

    // Calculate how many notes each tag is used in
    const tagUsageCounts = useMemo(() => {
        return tags.reduce((counts, tag) => {
            const count = notes?.filter(note => {
                if (note.tags && Array.isArray(note.tags)) {
                    return note.tags.some(tagId => tagId === tag.id || tagId === tag.id.toString());
                }
                if (note.tagIds && Array.isArray(note.tagIds)) {
                    return note.tagIds.some(tagId => tagId === tag.id || tagId === tag.id.toString());
                }
                return false;
            }).length || 0;
            counts[tag.id] = count;
            return counts;
        }, {});
    }, [notes, tags]);

    return (
        <div className="min-h-screen bg-bg-primary text-text-primary flex flex-col">
            <SettingsHeader loading={loading} navigate={navigate} activeTab={activeTab} />
            
            <div className="max-w-[1400px] mx-auto px-3 sm:px-4 py-4 sm:py-6 flex-1">
                <div className="flex flex-col md:flex-row gap-4 sm:gap-6 h-full">
                    {/* Sidebar navigation */}
                    <div className={`${isMobile ? 'w-full' : 'md:w-64'} shrink-0`}>
                        <div className="w-full sticky top-16 md:top-20 z-10 bg-bg-primary/95 backdrop-blur-sm pb-2">
                            <Tabs 
                                value={activeTab} 
                                onValueChange={setActiveTab} 
                                orientation="vertical"
                            >
                                <TabsList className="flex flex-row md:flex-col h-auto bg-overlay/5 p-1 rounded-lg w-full mb-3 md:mb-6 overflow-x-auto scrollbar-hide">
                                    <TabsTrigger value="account" className="flex items-center gap-2 justify-start md:w-full text-left whitespace-nowrap">
                                        <User className="h-4 w-4" />
                                        <span className="hidden sm:inline">Account</span>
                                    </TabsTrigger>
                                    <TabsTrigger value="tags" className="flex items-center gap-2 justify-start md:w-full text-left whitespace-nowrap">
                                        <Tag className="h-4 w-4" />
                                        <span className="hidden sm:inline">Tags</span>
                                    </TabsTrigger>
                                    <TabsTrigger value="statistics" className="flex items-center gap-2 justify-start md:w-full text-left whitespace-nowrap">
                                        <BarChart className="h-4 w-4" />
                                        <span className="hidden sm:inline">Statistics</span>
                                    </TabsTrigger>
                                    <TabsTrigger value="support" className="flex items-center gap-2 justify-start md:w-full text-left whitespace-nowrap">
                                        <Heart className="h-4 w-4" />
                                        <span className="hidden sm:inline">Support</span>
                                    </TabsTrigger>
                                    <TabsTrigger value="security" className="flex items-center gap-2 justify-start md:w-full text-left whitespace-nowrap">
                                        <Shield className="h-4 w-4" />
                                        <span className="hidden sm:inline">Security</span>
                                    </TabsTrigger>
                                </TabsList>
                            </Tabs>
                            
                            <div className="hidden md:block bg-overlay/5 rounded-lg p-4 space-y-2">
                                <h3 className="text-sm font-medium text-text-primary/80">Current Version</h3>
                                <p className="text-xs text-text-primary/60">Your Notes v0.0.5</p>
                            </div>
                        </div>
                    </div>
                    
                    {/* Fixed height content area */}
                    <div className="flex-1">
                        <div className="min-h-[calc(100vh-160px)] md:min-h-[700px]">
                            {activeTab === "account" && (
                                <div className="space-y-4 sm:space-y-6">
                                    <h2 className="text-lg sm:text-xl font-semibold mb-2 sm:mb-4">Account Settings</h2>
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                                        <AccountDetailsCard user={user} />
                                        <NoteActivityCard notes={notes} noteActivity={noteActivity} />
                                    </div>
                                </div>
                            )}
                            
                            {activeTab === "tags" && (
                                <div className="space-y-4 sm:space-y-6">
                                    <h2 className="text-lg sm:text-xl font-semibold mb-2 sm:mb-4">Tag Management</h2>
                                    <TagManagementCard
                                        tags={tags}
                                        tagState={tagState}
                                        setTagState={setTagState}
                                        setDialogs={setDialogs}
                                        handleTagAction={handleTagAction}
                                        tagUsageCounts={tagUsageCounts}
                                    />
                                </div>
                            )}
                            
                            {activeTab === "statistics" && (
                                <div className="space-y-4 sm:space-y-6">
                                    <h2 className="text-lg sm:text-xl font-semibold mb-2 sm:mb-4">Statistics</h2>
                                    <StatisticsCard notes={notes} tags={tags} />
                                </div>
                            )}
                            
                            {activeTab === "support" && (
                                <div className="space-y-4 sm:space-y-6">
                                    <h2 className="text-lg sm:text-xl font-semibold mb-2 sm:mb-4">Support Us</h2>
                                    <div className="max-w-lg">
                                        <DonationCard setDialogs={setDialogs} />
                                    </div>
                                </div>
                            )}
                            
                            {activeTab === "security" && (
                                <div className="space-y-4 sm:space-y-6">
                                    <h2 className="text-lg sm:text-xl font-semibold mb-2 sm:mb-4">Security & Privacy</h2>
                                    <div className="max-w-lg">
                                        <AccountActionsCard
                                            loading={loading}
                                            handleLogout={handleLogoutWithNavigation}
                                            handleDeleteAccount={handleDeleteAccountWithNavigation}
                                            setDialogs={setDialogs}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

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
                tagUsageCount={tagState.tagToDelete ? tagUsageCounts[tagState.tagToDelete] : 0}
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