// src/App.jsx
import React, { Suspense, lazy, useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Analytics } from '@vercel/analytics/react';
import { supabase } from './utils/supabaseClient';
import { GoogleDriveProvider, useGoogleDrive } from './contexts/GoogleDriveContext';
import { ToastProvider } from './contexts/ToastContext';
import { NotesProvider, useNotes } from './contexts/NotesContext';
import Home from './pages/home';
import Login from './pages/login';
import AuthCallback from './pages/auth/callback';
import ViewNote from './pages/note/view/[id]';
const Settings = lazy(() => import('./pages/settings'));
const SectionView = lazy(() => import('./pages/section/[id]'));
import ErrorBoundary from './components/ErrorBoundary';
import ProgressBar from './components/ProgressBar';
import NoteEditor from './pages/note/NoteEditor';
function AppContent({ session, isLoading: isAuthLoading, setIsInitialLoad }) {
  const { isLoading: isDriveLoading } = useGoogleDrive();
  const { isLoading: isNotesLoading, isSyncing, isInitialSync, loadingState } = useNotes();
  useEffect(() => {
    if (!isAuthLoading && !isDriveLoading && !isNotesLoading && !isInitialSync) {
      console.log('All initial loading complete, setting isInitialLoad to false');
      setIsInitialLoad(false);
    }
  }, [isAuthLoading, isDriveLoading, isNotesLoading, isInitialSync, setIsInitialLoad]);
  if (isAuthLoading) {
    return <ProgressBar progress={-1} message="Checking authentication..." />;
  }
  if (!session) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }
  if (isDriveLoading || (isNotesLoading && isInitialSync)) {
    return (
      <ProgressBar
        progress={loadingState.progress}
        message={loadingState.message}
      />
    );
  }
  return (
    <ErrorBoundary fallback={<div>Something went wrong, yo! Try refreshing.</div>}>
      <Suspense fallback={<ProgressBar progress={50} message="Loading..." />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/note/edit/:id" element={<NoteEditor />} />
          <Route path="/note/view/:id" element={<ViewNote />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/section/:id" element={<SectionView />} />
          <Route path="/create" element={<NoteEditor />} />
          <Route path="/login" element={<Navigate to="/" replace />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
}
function App() {
  const [session, setSession] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  useEffect(() => {
    let mounted = true;
    const initializeSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        if (mounted) setSession(session);
      } catch (err) {
        console.error('Error fetching session:', err);
        if (mounted) setSession(null);
      } finally {
        if (mounted) setIsLoading(false);
      }
    };
    initializeSession();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
      console.log('Auth state changed:', event);
      if (mounted) {
        setSession(newSession);
        if (event === 'SIGNED_IN') setIsInitialLoad(true);
        else if (event === 'SIGNED_OUT') setIsInitialLoad(false);
      }
    });
    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
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