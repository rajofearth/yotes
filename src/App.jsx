import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Analytics } from '@vercel/analytics/react';
import { supabase } from './utils/supabaseClient';
import { GoogleDriveProvider, useGoogleDrive } from './contexts/GoogleDriveContext';
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

function AppContent({ session, isLoading: isAuthLoading, setIsInitialLoad }) {
  const { isLoading: isDriveLoading } = useGoogleDrive();
  const { isLoading: isNotesLoading, isSyncing, isInitialSync, loadingState } = useNotes();

  useEffect(() => {
    // Set isInitialLoad to false when all initial loading is complete
    if (!isAuthLoading && !isDriveLoading && !isNotesLoading && !isInitialSync) {
      console.log('All initial loading complete, setting isInitialLoad to false');
      setIsInitialLoad(false);
    }
  }, [isAuthLoading, isDriveLoading, isNotesLoading, isInitialSync, setIsInitialLoad]);

  // Render Login page if no session exists
  if (!session && !isAuthLoading) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  // Show ProgressBar during initial loading (auth, drive, or notes sync)
  if (isAuthLoading || isDriveLoading || (isNotesLoading && isInitialSync)) {
    return (
      <ProgressBar
        progress={isAuthLoading ? 0 : loadingState.progress} // Use 0 during auth, then notes progress
        message={isAuthLoading ? 'Checking authentication...' : loadingState.message}
      />
    );
  }

  // Render authenticated routes when session exists and initial loading is complete
  return (
    <ErrorBoundary fallback={<div>Something went wrong</div>}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/note/edit/:id" element={<EditNote />} />
        <Route path="/note/view/:id" element={<ViewNote />} />
        <Route path="/section/:id" element={<SectionView />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/create" element={<CreateNote />} />
        <Route path="/login" element={<Navigate to="/" replace />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ErrorBoundary>
  );
}

function App() {
  const [session, setSession] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  useEffect(() => {
    const initializeSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          console.error('Initial session error:', error);
          setSession(null);
        } else {
          setSession(session);
        }
      } catch (err) {
        console.error('Error fetching session:', err);
        setSession(null);
      } finally {
        setIsLoading(false); // Ensure loading is false after auth check
      }
    };

    initializeSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
      console.log('Auth state changed:', event);
      setSession(newSession);
      if (event === 'SIGNED_IN') {
        setIsInitialLoad(true); // Reset for initial sync on sign-in
      } else if (event === 'SIGNED_OUT') {
        setIsInitialLoad(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <ToastProvider>
      <Router>
        <GoogleDriveProvider session={session}>
          <NotesProvider session={session}>
            <AppContent
              session={session}
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