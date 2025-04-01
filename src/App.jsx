// src/App.jsx
import React, { Suspense, lazy, useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Analytics } from '@vercel/analytics/react';
import { supabase } from './utils/supabaseClient';
import { GoogleDriveProvider, useGoogleDrive } from './contexts/GoogleDriveContext';
import { ToastProvider } from './contexts/ToastContext';
import { NotesProvider, useNotes } from './contexts/NotesContext'; // Ensure useNotes is imported

// Page Imports
import Home from './pages/home';
import Login from './pages/login'; // Adjusted path based on structure
import AuthCallback from './pages/auth/callback'; // Adjusted path
import ViewNote from './pages/note/view/[id]'; // Adjusted path
import NoteEditor from './pages/note/NoteEditor'; // Adjusted path

// Lazy Loaded Pages
const Settings = lazy(() => import('./pages/settings'));
const SectionView = lazy(() => import('./pages/section/[id]'));

// Component Imports
import ErrorBoundary from './components/ErrorBoundary';
import ProgressBar from './components/ProgressBar';

// AppContent receives isInitialLoad state and the setter
function AppContent({ session, isAuthLoading, isInitialLoad, setIsInitialLoad }) {
  // These hooks provide granular loading states
  const { isLoading: isDriveLoading, error: driveError } = useGoogleDrive(); // Get drive error
  const { isLoading: isNotesLoading, isInitialSync, loadingState, error: notesError } = useNotes(); // Get notes error

  // This effect correctly determines when the *entire initial load* is complete
  useEffect(() => {
    // --- *** KEY CHANGE *** ---
    // Only proceed if we are currently in the initial load phase
    if (isInitialLoad) {
        const allLoadingComplete = !isAuthLoading && !isDriveLoading && !isNotesLoading && !isInitialSync;
        const hasCriticalError = driveError || notesError;

        if (allLoadingComplete) {
            // If all loading is done AND there are no critical errors, mark initial load as finished.
            if (!hasCriticalError) {
                console.log('AppContent Effect: All initial loading complete, setting isInitialLoad to false');
                setIsInitialLoad(false);
            } else {
                // If loading finished but with errors, log it.
                // The error screen will be shown by the render logic below based on hasCriticalError.
                // We still set isInitialLoad to false so the main app routes *try* to render,
                // allowing the error screen within AppContent's render logic to take over.
                console.warn('AppContent Effect: Initial loading technically finished, but with errors. Setting isInitialLoad to false to show error screen.');
                 setIsInitialLoad(false);
            }
        }
        // If still loading, do nothing, wait for the next effect run when states change.
    }
    // Dependencies: Re-run when any loading state, error state, or isInitialLoad itself changes.
  }, [isAuthLoading, isDriveLoading, isNotesLoading, isInitialSync, driveError, notesError, isInitialLoad, setIsInitialLoad]);

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

  // 3. Show progress bar OR error screen ONLY if the overall initial load is NOT yet complete
  if (isInitialLoad) {
     // Check for critical init errors FIRST
     if (driveError || notesError) {
         // Render the dedicated error screen
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
        {/* Optional: Add a subtle indicator for background syncs if needed */}
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
          setIsInitialLoad(false); // No session, no initial load needed
        } else {
          console.log('Initial session fetched:', !!currentSession);
          setSession(currentSession);
          // If there's no session initially, the initial load doesn't involve Drive/Notes
          // If there IS a session, we NEED to perform the initial load sequence.
          setIsInitialLoad(!!currentSession);
        }
        setIsAuthLoading(false); // Authentication check is complete regardless of session presence
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

        // Reset isInitialLoad appropriately based on the event
        if (event === 'SIGNED_IN') {
            console.log("Auth: SIGNED_IN - Resetting isInitialLoad to true");
            setIsInitialLoad(true); // Start the initial load process for the new session
        } else if (event === 'SIGNED_OUT') {
            console.log("Auth: SIGNED_OUT - Setting isInitialLoad to false");
            setIsInitialLoad(false); // No initial load needed when signed out
        }
        // For TOKEN_REFRESHED or USER_UPDATED, isInitialLoad status should generally remain unchanged
        // unless the session becomes invalid, which would trigger SIGNED_OUT.
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
        {/* Pass session ONLY IF auth is resolved */}
        {/* Pass undefined during auth load to prevent providers from initializing prematurely */}
        <GoogleDriveProvider session={!isAuthLoading ? session : undefined}>
          <NotesProvider session={!isAuthLoading ? session : undefined}>
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