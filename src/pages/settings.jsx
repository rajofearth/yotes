import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../utils/supabaseClient';
import { useNotes } from '../hooks/useNotes';
import { useToast } from '../contexts/ToastContext';
import { Button } from '../components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { ArrowLeft, Trash2 } from 'lucide-react';

export default function Settings() {
    const navigate = useNavigate();
    const { notes, tags } = useNotes();
    const showToast = useToast();
    const [user, setUser] = useState(null);

    useEffect(() => {
        supabase.auth.getUser().then(({ data }) => setUser(data.user));
    }, []);

    const handleDeleteAccount = async () => {
        if (window.confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
            try {
                await supabase.auth.signOut();
                showToast('Account deletion requested. Contact support to complete.', 'success');
                navigate('/login');
            } catch (error) {
                showToast('Failed to delete account', 'error');
            }
        }
    };

    const handleLogout = async () => {
        try {
            await supabase.auth.signOut();
            showToast('Logged out successfully', 'success');
            navigate('/login');
        } catch (error) {
            showToast('Failed to log out', 'error');
        }
    };

    return (
        <div className="min-h-screen bg-bg-primary">
            <header className="border-b border-overlay/10">
                <div className="max-w-[1920px] mx-auto px-4 py-4 flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <h1 className="text-xl font-semibold">Settings</h1>
                </div>
            </header>
            <main className="max-w-[1920px] mx-auto px-4 py-8 space-y-8">
                <Card>
                    <CardHeader>
                        <CardTitle>Stats</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p>Total Notes: {notes.length}</p>
                        <p>Total Tags: {tags.length}</p>
                        <p>Storage Used: Calculating storage usage requires Google Drive API metadata (not implemented).</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Account Details</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p>Email: {user?.email || 'Loading...'}</p>
                        <p>Name: {user?.user_metadata?.name || 'Not set'}</p>
                        <p>Joined: {new Date(user?.created_at).toLocaleDateString()}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Account Actions</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Button variant="outline" onClick={handleLogout} className="mb-4">
                            Logout
                        </Button>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Danger Zone</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Button variant="destructive" onClick={handleDeleteAccount}>
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete Account
                        </Button>
                    </CardContent>
                </Card>
            </main>
        </div>
    );
}