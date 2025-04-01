import React, { Suspense, lazy, useEffect, useState, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Analytics } from '@vercel/analytics/react';
import { supabase } from './utils/supabaseClient';
import { GoogleDriveProvider, useGoogleDrive } from './contexts/GoogleDriveContext';
import { ToastProvider } from './contexts/ToastContext';
import { NotesProvider, useNotes } from './contexts/NotesContext';

import Home from './pages/home';
import Login from './pages/login';
import AuthCallback from './pages/auth/callback';
import Settings from './pages/settings';
const SectionView = lazy(() => import('./pages/section/[id]'));
const ViewNote = lazy(() => import('./pages/note/view/[id]'));
const NoteEditor = lazy(() => import('./pages/note/NoteEditor'));
import ErrorBoundary from './components/ErrorBoundary';
import ProgressBar from './components/ProgressBar';
import PWAReloadPrompt from './components/PWAReloadPrompt';

function AppContent({ session, isAuthLoading, isInitialLoad, setIsInitialLoad }) {
  const { isLoading: isDriveLoading, error: driveError } = useGoogleDrive();
  const { isLoading: isNotesLoading, isInitialSync, loadingState, error: notesError } = useNotes();
  const initialLoadCompletedRef = useRef(false);

  useEffect(() => {
    const allLoadingComplete = !isAuthLoading && !isDriveLoading && !isNotesLoading && !isInitialSync;
    const hasCriticalError = driveError || notesError;

    if (isInitialLoad && allLoadingComplete && !initialLoadCompletedRef.current) {
      if (!hasCriticalError) {
        // console.log('AppContent Effect: *** Initial Load Sequence Complete *** Setting isInitialLoad to false.');
        setIsInitialLoad(false);
        initialLoadCompletedRef.current = true;
      } else {
        // console.warn('AppContent Effect: Initial loading finished, but with critical errors. Setting isInitialLoad to false to show error screen.');
        setIsInitialLoad(false);
        initialLoadCompletedRef.current = true;
      }
    }
  }, [
      isAuthLoading,
      isDriveLoading,
      isNotesLoading,
      isInitialSync,
      driveError,
      notesError,
      isInitialLoad,
      setIsInitialLoad
  ]);

  // --- Render Logic ---

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

  if (isInitialLoad) {
     const hasCriticalError = driveError || notesError;
     if (hasCriticalError) {
         return (
             <div className="min-h-screen bg-bg-primary flex flex-col items-center justify-center p-4 text-center">
                 <h1 className="text-2xl font-semibold text-red-500 mb-4">Initialization Error</h1>
                 <p className="text-text-primary/80 mb-2">Could not load required data.</p>
                 <p className="text-sm text-text-primary/60 mb-6">{(driveError || notesError)?.message || 'Unknown error'}</p>
                 <button
                    onClick={() => window.location.reload()}
                    className="mt-4 bg-overlay/10 hover:bg-overlay/20 px-4 py-2 rounded text-text-primary"
                  >
                    Retry
                  </button>
             </div>
         );
     } else {
         return (
           <ProgressBar
             progress={loadingState?.progress ?? (isDriveLoading ? 30 : 10)}
             message={loadingState?.message ?? (isDriveLoading ? 'Connecting Drive...' : 'Initializing...')}
           />
         );
     }
  }

  // --- Initial Load Complete ---
  return (
    <ErrorBoundary fallback={<div>Something went wrong! Try refreshing.</div>}>
      <Suspense fallback={<ProgressBar progress={-1} message="Loading page..." />}>
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
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  useEffect(() => {
    let mounted = true;
    // console.log('App mounted. Setting up session check and auth listener.');

    supabase.auth.getSession().then(({ data: { session: currentSession }, error }) => {
      if (mounted) {
        if (error) {
          // console.error('App Effect: Error fetching initial session:', error);
          setSession(null);
          setIsInitialLoad(false);
        } else {
          // console.log('App Effect: Initial session fetched:', !!currentSession);
          setSession(currentSession);
          setIsInitialLoad(!!currentSession);
        }
        setIsAuthLoading(false);
        // console.log(`App Effect: Initial auth check complete. isAuthLoading=false, isInitialLoad=${!!currentSession}`);
      }
    }).catch(err => {
         if (mounted) {
            // console.error('App Effect: Exception fetching initial session:', err);
            setSession(null);
            setIsAuthLoading(false);
            setIsInitialLoad(false);
         }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
       if (!mounted) return;
        // console.log(`App Effect: Auth state changed: ${event}`, !!newSession);
        const wasPreviouslyAuthenticated = !!session;
        const isNowAuthenticated = !!newSession;

        setSession(newSession);
        setIsAuthLoading(false);

        if (event === 'SIGNED_IN' && !wasPreviouslyAuthenticated) {
            // console.log("App Effect: Auth SIGNED_IN (from unauth) -> Resetting isInitialLoad = true");
            setIsInitialLoad(true);
        } else if (event === 'SIGNED_OUT') {
            // console.log("App Effect: Auth SIGNED_OUT -> Setting isInitialLoad = false");
            setIsInitialLoad(false);
        } else if (event === 'INITIAL_SESSION' && isNowAuthenticated && !isInitialLoad) {
             // Handles case where INITIAL_SESSION arrives after getSession, confirming auth
             // console.log("App Effect: Auth INITIAL_SESSION (auth confirmed) -> Setting isInitialLoad = true");
             setIsInitialLoad(true);
        } else if (event === 'INITIAL_SESSION' && !isNowAuthenticated) {
             // console.log("App Effect: Auth INITIAL_SESSION (unauth confirmed) -> Setting isInitialLoad = false");
             setIsInitialLoad(false);
        }
    });

    return () => {
      mounted = false;
      // console.log('App unmounting. Unsubscribing auth listener.');
      subscription?.unsubscribe();
    };
  }, []); // Keep empty

  return (
    <ToastProvider>
      <Router>
        <GoogleDriveProvider session={!isAuthLoading ? session : undefined}>
          <NotesProvider session={!isAuthLoading ? session : undefined}>
            <AppContent
              session={session}
              isAuthLoading={isAuthLoading}
              isInitialLoad={isInitialLoad}
              setIsInitialLoad={setIsInitialLoad}
            />
            <PWAReloadPrompt />
            <Analytics />
          </NotesProvider>
        </GoogleDriveProvider>
      </Router>
    </ToastProvider>
  );
}

export default App;