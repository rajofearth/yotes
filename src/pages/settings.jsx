import { useState, useEffect, useMemo } from 'react';
import { useSettings } from '../hooks/useSettings';
import { SettingsHeader } from '../components/settings/SettingsHeader';
import { DeleteAccountDialog } from '../components/settings/DeleteAccountDialog';
import { DeleteTagDialog } from '../components/settings/DeleteTagDialog';
import { CreateTagDialog } from '../components/settings/CreateTagDialog';
import { UPIDonationDialog } from '../components/settings/UPIDonationDialog';
import { useNavigate, useLocation } from 'react-router-dom';
import { TagManagementCard } from '../components/settings/TagManagementCard';
import { StatisticsCard } from '../components/settings/StatisticsCard';
import { AccountDetailsCard } from '../components/settings/AccountDetailsCard';
import { NoteActivityCard } from '../components/settings/NoteActivityCard';
import { DonationCard } from '../components/settings/DonationCard';
import { AccountActionsCard } from '../components/settings/AccountActionsCard';
import { AIFeaturesCard } from '../components/settings/AIFeaturesCard';
import BackupCard from '../components/settings/BackupCard.jsx';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Settings as SettingsIcon, User, Tag, BarChart, Heart, Shield, Brain } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../components/ui/dialog';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { useNotes } from '../hooks/useNotes';
import { useConvex, useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { buildExportZip } from '../services/exporter';
import { useAuthReady } from '../hooks/useAuthReady';

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
        aiSettings,
        handleSaveApiKey,
        handleToggleAiFeatures,
    } = useSettings();
    const navigate = useNavigate();
    const location = useLocation();
    const [activeTab, setActiveTab] = useState(location.state?.activeTab || "account");
    const [isMobile, setIsMobile] = useState(false);
    const [dialogs, setDialogs] = useState({
        deleteAccount: false,
        deleteTag: false,
        createTag: false,
        upiDonation: false,
        exportData: false,
    });

    const { convexUserId } = useNotes();
    const convex = useConvex();
    const { hasSession, isAuthReadyForData } = useAuthReady();
    const rawAI = useQuery(
        api.ai.getSettingsRaw,
        convexUserId && isAuthReadyForData ? { userId: convexUserId } : 'skip'
    );

    const [exportPass, setExportPass] = useState('');
    const [exportBusy, setExportBusy] = useState(false);

    useEffect(() => {
        const checkIfMobile = () => {
            setIsMobile(window.innerWidth < 768);
        };
        checkIfMobile();
        window.addEventListener('resize', checkIfMobile);
        return () => { window.removeEventListener('resize', checkIfMobile); };
    }, []);

    const handleLogoutWithNavigation = async () => { await handleLogout(); navigate('/login'); };
    const handleDeleteAccountWithNavigation = async () => { await handleDeleteAccount(); navigate('/login'); };

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

    const handleExport = async () => {
        if (!exportPass || exportPass.length < 8) return;
        try {
            setExportBusy(true);

            const profile = {
                externalId: user?.id || null,
                email: user?.email || null,
                displayName: user?.name || null,
            };

            const data = {
                notes: notes.map(n => ({ id: n.id, title: n.title || '', description: n.description || '', content: n.content || '', tags: n.tags || [], createdAt: n.createdAt, updatedAt: n.updatedAt })),
                tags: tags.map(t => ({ id: t.id, name: t.name || '', color: t.color || '', createdAt: t.createdAt, updatedAt: t.updatedAt })),
            };

            const blob = await buildExportZip({
                dek: window.__yotesDek || null,
                profile,
                notes,
                tags,
                aiRaw: rawAI || null,
            });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `yotes-export-${Date.now()}.zip`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);

            setDialogs(prev => ({ ...prev, exportData: false }));
            setExportPass('');
        } finally {
            setExportBusy(false);
        }
    };

    return (
        <div className="min-h-screen bg-bg-primary text-text-primary flex flex-col">
            <SettingsHeader loading={loading} navigate={navigate} activeTab={activeTab} />
            <div className="max-w-[1400px] mx-auto px-3 sm:px-4 py-4 sm:py-6 flex-1">
                <div className="flex flex-col md:flex-row gap-4 sm:gap-6 h-full">
                    <div className={`${isMobile ? 'w-full' : 'md:w-64'} shrink-0`}>
                        <div className="w-full sticky top-16 md:top-20 z-10 bg-bg-primary/95 backdrop-blur-sm pb-2">
                            <Tabs value={activeTab} onValueChange={setActiveTab} orientation="vertical">
                                <TabsList className="flex flex-row md:flex-col h-auto bg-overlay/5 p-1 rounded-lg w-full mb-3 md:mb-6 overflow-x-auto scrollbar-hide">
                                    <TabsTrigger value="account" className="flex items-center gap-2 justify-start md:w-full text-left whitespace-nowrap"><User className="h-4 w-4" /><span className="hidden sm:inline">Account</span></TabsTrigger>
                                    <TabsTrigger value="tags" className="flex items-center gap-2 justify-start md:w-full text-left whitespace-nowrap"><Tag className="h-4 w-4" /><span className="hidden sm:inline">Tags</span></TabsTrigger>
                                    <TabsTrigger value="statistics" className="flex items-center gap-2 justify-start md:w-full text-left whitespace-nowrap"><BarChart className="h-4 w-4" /><span className="hidden sm:inline">Statistics</span></TabsTrigger>
                                    <TabsTrigger value="ai" className="flex items-center gap-2 justify-start md:w-full text-left whitespace-nowrap"><Brain className="h-4 w-4" /><span className="hidden sm:inline">AI Features</span></TabsTrigger>
                                    <TabsTrigger value="support" className="flex items-center gap-2 justify-start md:w-full text-left whitespace-nowrap"><Heart className="h-4 w-4" /><span className="hidden sm:inline">Support</span></TabsTrigger>
                                    <TabsTrigger value="security" className="flex items-center gap-2 justify-start md:w-full text-left whitespace-nowrap"><Shield className="h-4 w-4" /><span className="hidden sm:inline">Security</span></TabsTrigger>
                                </TabsList>
                            </Tabs>
                            <div className="hidden md:block bg-overlay/5 rounded-lg p-4 space-y-2">
                                <h3 className="text-sm font-medium text-text-primary/80">Current Version</h3>
                                <p className="text-xs text-text-primary/60">Yotes v0.0.8</p>
                            </div>
                        </div>
                    </div>
                    <div className="flex-1">
                        <div className="min-h-[calc(100vh-160px)] md:min-h-[700px]">
                            {activeTab === 'account' && (
                                <div className="space-y-4 sm:space-y-6">
                                    <h2 className="text-lg sm:text-xl font-semibold mb-2 sm:mb-4">Account Settings</h2>
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                                        <AccountDetailsCard user={user} />
                                        <NoteActivityCard notes={notes} noteActivity={noteActivity} />
                                    </div>
                                    <div className="max-w-2xl"><BackupCard user={user} /></div>
                                </div>
                            )}
                            {activeTab === 'tags' && (
                                <div className="space-y-4 sm:space-y-6">
                                    <h2 className="text-lg sm:text-xl font-semibold mb-2 sm:mb-4">Tag Management</h2>
                                    <TagManagementCard tags={tags} tagState={tagState} setTagState={setTagState} setDialogs={setDialogs} handleTagAction={handleTagAction} tagUsageCounts={tagUsageCounts} />
                                </div>
                            )}
                            {activeTab === 'statistics' && (
                                <div className="space-y-4 sm:space-y-6">
                                    <h2 className="text-lg sm:text-xl font-semibold mb-2 sm:mb-4">Statistics</h2>
                                    <StatisticsCard notes={notes} tags={tags} />
                                </div>
                            )}
                            {activeTab === 'support' && (
                                <div className="space-y-4 sm:space-y-6">
                                    <h2 className="text-lg sm:text-xl font-semibold mb-2 sm:mb-4">Support Us</h2>
                                    <div className="max-w-lg"><DonationCard setDialogs={setDialogs} /></div>
                                </div>
                            )}
                            {activeTab === 'ai' && (
                                <div className="space-y-4 sm:space-y-6">
                                    <h2 className="text-lg sm:text-xl font-semibold mb-2 sm:mb-4">AI Features</h2>
                                    <div className="max-w-lg"><AIFeaturesCard aiSettings={aiSettings} onSaveApiKey={handleSaveApiKey} onToggleAiFeatures={handleToggleAiFeatures} /></div>
                                </div>
                            )}
                            {activeTab === 'security' && (
                                <div className="space-y-4 sm:space-y-6">
                                    <h2 className="text-lg sm:text-xl font-semibold mb-2 sm:mb-4">Security & Privacy</h2>
                                    <div className="max-w-lg">
                                        <AccountActionsCard loading={loading} handleLogout={handleLogoutWithNavigation} handleDeleteAccount={handleDeleteAccountWithNavigation} setDialogs={setDialogs} onExport={() => setDialogs(prev => ({ ...prev, exportData: true }))} />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <DeleteAccountDialog open={dialogs.deleteAccount} onOpenChange={val => setDialogs(prev => ({ ...prev, deleteAccount: val }))} loading={loading} handleDeleteAccount={handleDeleteAccountWithNavigation} />
            <DeleteTagDialog open={dialogs.deleteTag} onOpenChange={val => setDialogs(prev => ({ ...prev, deleteTag: val }))} loading={loading} handleTagAction={handleTagAction} tagId={tagState.tagToDelete} tagUsageCount={tagState.tagToDelete ? tagUsageCounts[tagState.tagToDelete] : 0} />
            <CreateTagDialog open={dialogs.createTag} onOpenChange={val => setDialogs(prev => ({ ...prev, createTag: val }))} tagState={tagState} setTagState={setTagState} handleTagAction={handleTagAction} />
            <UPIDonationDialog open={dialogs.upiDonation} onOpenChange={val => setDialogs(prev => ({ ...prev, upiDonation: val }))} />

            <Dialog open={dialogs.exportData} onOpenChange={val => setDialogs(prev => ({ ...prev, exportData: val }))}>
                <DialogContent className="bg-bg-primary border-overlay/10 shadow-lg">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-semibold text-text-primary">Export Your Data</DialogTitle>
                        <DialogDescription className="text-text-primary/60">Enter your encryption passphrase to export decrypted data as a ZIP.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3 py-2">
                        <label className="text-sm text-text-primary/80">Passphrase</label>
                        <Input type="password" placeholder="Enter passphrase" value={exportPass} onChange={e => setExportPass(e.target.value)} />
                        <p className="text-xs text-text-primary/60">Notes, tags, and AI key (if available) will be exported decrypted.</p>
                    </div>
                    <DialogFooter className="flex flex-col sm:flex-row justify-end gap-4">
                        <Button variant="outline" onClick={() => setDialogs(prev => ({ ...prev, exportData: false }))} className="bg-overlay/5 hover:bg-overlay/10">Cancel</Button>
                        <Button onClick={handleExport} disabled={exportBusy || !exportPass || exportPass.length < 8} className="bg-primary hover:bg-primary/90">{exportBusy ? 'Exporting...' : 'Export ZIP'}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}