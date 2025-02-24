// src/App.jsx
import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Analytics } from '@vercel/analytics/react';
import { supabase } from './utils/supabaseClient';
import { GoogleDriveProvider } from './contexts/GoogleDriveContext';
import { ToastProvider } from './contexts/ToastContext';
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
import { useNotes } from './hooks/useNotes';
import { useGoogleDrive } from './contexts/GoogleDriveContext';

function ProtectedRoute({ children, session, isSignedOut, isLoading }) {
  const { isLoading: isDriveLoading } = useGoogleDrive();
  const { isLoading: isNotesLoading, isSyncing, isInitialSync, error: notesError, loadingState } = useNotes();

  // Immediate redirect if signed out (no session)
  if (isSignedOut) {
    //console.log('User is signed out, redirecting to login');
    return <Navigate to="/login" replace />;
  }

  // Show loading state if any part is still initializing
  if (isLoading || isDriveLoading || isNotesLoading || (isSyncing && isInitialSync)) {
    //console.log('ProtectedRoute loading state:', { loading: isLoading, isDriveLoading, isNotesLoading });
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center">
        <ProgressBar progress={loadingState.progress} message={loadingState.message} />
      </div>
    );
  }

  // Render children if session is valid
  if (session) {
    return (
      <ErrorBoundary
        fallback={<div>{notesError ? `Error: ${notesError.message}` : 'Something went wrong'}</div>}
      >
        {children}
      </ErrorBoundary>
    );
  }
  return null;
}

function App() {
  const [session, setSession] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSignedOut, setIsSignedOut] = useState(false);

  useEffect(() => {
    const initializeSession = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) console.error('Initial session error:', error);
      setSession(session);
      setIsSignedOut(!session); // Only signed out if no session
      setIsLoading(false);
    };
    initializeSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
      //console.log('Auth state changed:', event);
      setSession(newSession);
      setIsSignedOut(!newSession); // Update based on session presence
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <ToastProvider>
      <Router>
        <GoogleDriveProvider>
          <Routes>
            <Route
              path="/"
              element={
                <ProtectedRoute session={session} isSignedOut={isSignedOut} isLoading={isLoading}>
                  <Home />
                </ProtectedRoute>
              }
            />
            <Route
              path="/note/edit/:id"
              element={
                <ProtectedRoute session={session} isSignedOut={isSignedOut} isLoading={isLoading}>
                  <EditNote />
                </ProtectedRoute>
              }
            />
            <Route
              path="/note/view/:id"
              element={
                <ProtectedRoute session={session} isSignedOut={isSignedOut} isLoading={isLoading}>
                  <ViewNote />
                </ProtectedRoute>
              }
            />
            <Route
              path="/section/:id"
              element={
                <ProtectedRoute session={session} isSignedOut={isSignedOut} isLoading={isLoading}>
                  <SectionView />
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute session={session} isSignedOut={isSignedOut} isLoading={isLoading}>
                  <Settings />
                </ProtectedRoute>
              }
            />
            <Route
              path="/login"
              element={isSignedOut && !isLoading ? <Login /> : <Navigate to="/" replace />}
            />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route
              path="/create"
              element={
                <ProtectedRoute session={session} isSignedOut={isSignedOut} isLoading={isLoading}>
                  <CreateNote />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <Analytics />
        </GoogleDriveProvider>
      </Router>
    </ToastProvider>
  );
}

export default App;