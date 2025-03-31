import React, { Suspense, lazy, useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Analytics } from '@vercel/analytics/react';
import { supabase } from './utils/supabaseClient';
import { GoogleDriveProvider, useGoogleDrive } from './contexts/GoogleDriveContext';
import { ToastProvider } from './contexts/ToastContext';
import { NotesProvider, useNotes } from './contexts/NotesContext'; // Ensure useNotes is imported
import Home from './pages/home';
import Login from './pages/login';
import AuthCallback from './pages/auth/callback';
import ViewNote from './pages/note/view/[id]';
const Settings = lazy(() => import('./pages/settings'));
const SectionView = lazy(() => import('./pages/section/[id]'));
import ErrorBoundary from './components/ErrorBoundary';
import ProgressBar from './components/ProgressBar';
import NoteEditor from './pages/note/NoteEditor';

// AppContent receives isInitialLoad state and the setter
function AppContent({ session, isAuthLoading, isInitialLoad, setIsInitialLoad }) {
  // These hooks provide granular loading states
  const { isLoading: isDriveLoading, error: driveError } = useGoogleDrive(); // Get drive error
  const { isLoading: isNotesLoading, isInitialSync, loadingState, error: notesError } = useNotes(); // Get notes error

  // This effect correctly determines when the *entire initial load* is complete
  useEffect(() => {
    // Only set isInitialLoad to false once ALL initial loading is done
    if (!isAuthLoading && !isDriveLoading && !isNotesLoading && !isInitialSync) {
      // Check for critical errors before marking load as complete
       if (!driveError && !notesError) {
           console.log('All initial loading complete, setting isInitialLoad to false');
           setIsInitialLoad(false);
       } else {
            console.warn('Initial loading technically finished, but with errors. isInitialLoad remains true to potentially show error state.');
            // Keep isInitialLoad true if there were critical init errors? Or handle error display differently.
            // For now, let's assume we might want to show an error page instead of the app.
            // Setting it to false allows the app routes to potentially render and handle errors internally.
             setIsInitialLoad(false); // Let's proceed and let components handle errors
       }
    }
    // We don't necessarily need an else condition to set it back to true,
    // as the App component's state handles the initial value.
  }, [isAuthLoading, isDriveLoading, isNotesLoading, isInitialSync, driveError, notesError, setIsInitialLoad]);

  // --- Render Logic ---

  // 1. Show progress bar during initial Authentication Check
  if (isAuthLoading) {
    // Use indeterminate progress for auth check
    return <ProgressBar progress={-1} message="Checking authentication..." />;
  }

  // 2. Handle No Session (Redirect to Login)
  if (!session) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  // 3. Show progress bar ONLY if the overall initial load is NOT yet complete
  //    (This covers Drive connection and initial Notes sync AFTER auth is done)
  if (isInitialLoad) {
     // Use the detailed loadingState from useNotes for progress during this phase
     // Also check for critical init errors here
     if (driveError || notesError) {
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
     }
     // Otherwise, show the progress bar with details from loadingState
    return (
      <ProgressBar
        // Use loadingState from useNotes context for progress/message
        progress={loadingState?.progress ?? (isDriveLoading ? 30 : 10)} // Provide fallback progress
        message={loadingState?.message ?? (isDriveLoading ? 'Connecting Drive...' : 'Initializing...')}
      />
    );
  }

  // 4. Initial Load is Complete: Render the main application
  //    Subsequent loading (e.g., background syncs via isNotesLoading) won't trigger the main progress bar
  return (
    <ErrorBoundary fallback={<div>Something went wrong! Try refreshing.</div>}>
      <Suspense fallback={<ProgressBar progress={-1} message="Loading page..." />}>
        {/* Add a subtle loading indicator for background syncs if desired */}
        {/* {isNotesLoading && !isInitialSync && <div className="fixed top-0 left-0 w-full h-1 bg-blue-500 animate-pulse z-[999]"></div>} */}
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/note/edit/:id" element={<NoteEditor />} />
          <Route path="/note/view/:id" element={<ViewNote />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/section/:id" element={<SectionView />} />
          <Route path="/create" element={<NoteEditor />} />
          {/* Redirect authenticated users away from login */}
          <Route path="/login" element={<Navigate to="/" replace />} />
          <Route path="/auth/callback" element={<AuthCallback />} /> {/* Keep callback */}
          <Route path="*" element={<Navigate to="/" replace />} /> {/* Catch-all */}
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
}

// App component manages the top-level isInitialLoad state
function App() {
  const [session, setSession] = useState(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true); // Renamed from isLoading for clarity
  const [isInitialLoad, setIsInitialLoad] = useState(true); // Tracks the ENTIRE initial app load sequence

  useEffect(() => {
    let mounted = true;
    console.log('App mounted. Setting up session check and auth listener.');

    // Initial Session Check
    supabase.auth.getSession().then(({ data: { session: currentSession }, error }) => {
      if (mounted) {
        if (error) {
          console.error('Error fetching initial session:', error);
          setSession(null);
        } else {
          console.log('Initial session fetched:', !!currentSession);
          setSession(currentSession);
           // If there's no session initially, the initial load doesn't involve Drive/Notes
          if (!currentSession) {
              setIsInitialLoad(false);
          } else {
              setIsInitialLoad(true); // Needs Drive/Notes check
          }
        }
        setIsAuthLoading(false); // Authentication check is complete
      }
    }).catch(err => {
         if (mounted) {
            console.error('Exception fetching initial session:', err);
            setSession(null);
            setIsAuthLoading(false);
            setIsInitialLoad(false); // Error means we can't proceed with initial load
         }
    });

    // Auth State Change Listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
       if (!mounted) return;
        console.log('Auth state changed:', event, !!newSession);
        setSession(newSession);
        setIsAuthLoading(false); // Any auth change means auth check is resolved

        // Reset isInitialLoad appropriately on sign-in/sign-out
        if (event === 'SIGNED_IN') {
            console.log("Auth: SIGNED_IN - Resetting isInitialLoad to true");
            setIsInitialLoad(true); // Start the initial load process for the new session
        } else if (event === 'SIGNED_OUT') {
            console.log("Auth: SIGNED_OUT - Setting isInitialLoad to false");
            setIsInitialLoad(false); // No initial load needed when signed out
        }
        // For TOKEN_REFRESHED or USER_UPDATED, isInitialLoad status depends on previous state
        // Usually, these don't require a full reload state reset unless session becomes invalid
    });

    // Cleanup
    return () => {
      mounted = false;
      console.log('App unmounting. Unsubscribing auth listener.');
      subscription?.unsubscribe();
    };
  }, []); // Run only once on App mount

  return (
    <ToastProvider>
      <Router>
        {/* Pass session ONLY IF auth is resolved AND session exists */}
        <GoogleDriveProvider session={!isAuthLoading && session ? session : null}>
          <NotesProvider session={!isAuthLoading && session ? session : null}>
            <AppContent
              session={session}
              isAuthLoading={isAuthLoading}
              isInitialLoad={isInitialLoad}
              setIsInitialLoad={setIsInitialLoad} // Pass down setter
            />
            <Analytics />
          </NotesProvider>
        </GoogleDriveProvider>
      </Router>
    </ToastProvider>
  );
}

export default App;