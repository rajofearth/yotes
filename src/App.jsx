import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Analytics } from '@vercel/analytics/react';
import { supabase } from './utils/supabaseClient';
import { GoogleDriveProvider, useGoogleDrive } from './contexts/GoogleDriveContext'; // Ensure useGoogleDrive is imported
import { ToastProvider } from './contexts/ToastContext';
import { NotesProvider, useNotes } from './contexts/NotesContext';
import Home from './pages/home';
import Login from './pages/login';
import AuthCallback from './pages/auth/callback';
import CreateNote from './pages/create';
import EditNote from './pages/note/edit/[id]';
import ViewNote from './pages/note/view/[id]';
import SectionView from './pages/section/[id]';
import Settings from './pages/settings';
import ErrorBoundary from './components/ErrorBoundary';
import ProgressBar from './components/ProgressBar';

function AppContent({ session, isSignedOut, isLoading, setIsInitialLoad }) {
    const { isLoading: isDriveLoading } = useGoogleDrive(); // Now correctly imported
    const { isLoading: isNotesLoading, isSyncing, isInitialSync, error: notesError, loadingState } = useNotes();

    useEffect(() => {
        if (!isLoading && !isDriveLoading && !isNotesLoading && !isInitialSync) {
            console.log('All loading complete, setting isInitialLoad to false');
            setIsInitialLoad(false);
        }
    }, [isLoading, isDriveLoading, isNotesLoading, isInitialSync, setIsInitialLoad]);

    if (isSignedOut) {
        return <Navigate to="/login" replace />;
    }

    if (isLoading || isDriveLoading || isNotesLoading || (isSyncing && isInitialSync)) {
        return <ProgressBar progress={loadingState.progress} message={loadingState.message} />;
    }

    if (session) {
        return (
            <ErrorBoundary
                fallback={<div>{notesError ? `Error: ${notesError.message}` : 'Something went wrong'}</div>}
            >
                <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/note/edit/:id" element={<EditNote />} />
                    <Route path="/note/view/:id" element={<ViewNote />} />
                    <Route path="/section/:id" element={<SectionView />} />
                    <Route path="/settings" element={<Settings />} />
                    <Route
                        path="/login"
                        element={isSignedOut && !isLoading ? <Login /> : <Navigate to="/" replace />}
                    />
                    <Route path="/auth/callback" element={<AuthCallback />} />
                    <Route path="/create" element={<CreateNote />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </ErrorBoundary>
        );
    }
    return null;
}

function App() {
    const [session, setSession] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSignedOut, setIsSignedOut] = useState(false);
    const [isInitialLoad, setIsInitialLoad] = useState(true);

    useEffect(() => {
        const initializeSession = async () => {
            const { data: { session }, error } = await supabase.auth.getSession();
            if (error) console.error('Initial session error:', error);
            setSession(session);
            setIsSignedOut(!session);
            setIsLoading(false);
        };
        initializeSession();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
            setSession(newSession);
            setIsSignedOut(!newSession);
            if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN') {
                setIsInitialLoad(true);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    return (
        <ToastProvider>
            <Router>
                <GoogleDriveProvider>
                    <NotesProvider>
                        <AppContent
                            session={session}
                            isSignedOut={isSignedOut}
                            isLoading={isLoading}
                            setIsInitialLoad={setIsInitialLoad}
                        />
                        <Analytics />
                    </NotesProvider>
                </GoogleDriveProvider>
            </Router>
        </ToastProvider>
    );
}

export default App;