import React, { Suspense, lazy, useEffect, useState, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Analytics } from '@vercel/analytics/react';
import { supabase } from './utils/supabaseClient';
import { findSupabaseLocalStorageKey } from './hooks/useSettings';
// GoogleDrive removed; using Convex
import { ToastProvider, useToast } from './contexts/ToastContext';
import { NotesProvider, useNotes } from './contexts/NotesContext';
import { useOnlineStatus } from './contexts/OnlineStatusContext';
import { OfflineBadge } from './components/OfflineBadge';
import { SyncTriggerBadge } from './components/SyncTriggerBadge';
import { SyncProgressOverlay } from './components/SyncProgressOverlay';
import ViewNote from './pages/note/view/[id]';
import Home from './pages/home';
import Login from './pages/login'; 
import AuthCallback from './pages/auth/callback';
import Settings from './pages/settings';
const SectionView = lazy(() => import('./pages/section/[id]'));
import NoteEditor from './pages/note/NoteEditor';
import ErrorBoundary from './components/ErrorBoundary';
import ProgressBar from './components/ProgressBar';
import PWAReloadPrompt from './components/PWAReloadPrompt';
import SyncButton from './components/SyncButton';

function AppContent({ session, isAuthLoading, isInitialLoad, setIsInitialLoad }) {
  const isOnline = useOnlineStatus();
  const showToast = useToast();
  const { isLoading: isDriveLoading, error: driveError } = { isLoading: false, error: null };
  const {
    isLoading: isNotesLoading, // This now primarily reflects cache loading state
    isInitialSync, // Reflects the full initial load sequence (cache + optional drive)
    loadingState,
    error: notesError,
    manualSyncWithDrive,
    isManualSyncing,
    syncProgressMessage,
    hasPendingChanges,
    syncDiscrepancyDetected,
  } = useNotes();
  const initialLoadCompletedRef = useRef(false);
  const firstOfflineToastShown = useRef(false);

  // Show offline messages
  useEffect(() => {
    if (session && !isOnline) {
      if (!firstOfflineToastShown.current) {
        setTimeout(() => {
          showToast('You are currently offline.', 'info');
          setTimeout(() => showToast('Changes are saved locally.', 'info'), 500);
          firstOfflineToastShown.current = true;
        }, 1000);
      }
    } else if (session && isOnline) {
      firstOfflineToastShown.current = false; // Reset when back online
    }
  }, [isOnline, session, showToast]);

  // Listen for global online/offline events
  useEffect(() => {
    const handleOffline = () => {
      console.log('App: Detected offline status via global event');
      if (isInitialLoad) {
        setIsInitialLoad(false);
      }
    };
    
    window.addEventListener('app:offline', handleOffline);
    
    return () => {
      window.removeEventListener('app:offline', handleOffline);
    };
  }, [isInitialLoad, setIsInitialLoad]);

  // Determine overall initial loading status
  const stillLoading = isAuthLoading || isInitialSync || isNotesLoading;

  // Manage isInitialLoad state based on combined loading status
  useEffect(() => {
     if (!stillLoading && !initialLoadCompletedRef.current) {
        setIsInitialLoad(false);
        initialLoadCompletedRef.current = true;
     }
     
     // Force exit loading state if data is loaded but screen is still showing
     if (loadingState?.progress === 100 && loadingState?.message === 'Data loaded') {
        setTimeout(() => {
          setIsInitialLoad(false);
          initialLoadCompletedRef.current = true;
        }, 500); // Short delay to ensure transition is smooth
     }
  }, [stillLoading, setIsInitialLoad, loadingState]);


  // --- Render Logic ---
  if (isAuthLoading) {
    return <ProgressBar progress={-1} message="Checking authentication..." />;
  }

  if (!session) {
    // Routes for logged-out users
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  // Logged In: Show Initial Loading / Error / App
  if (isInitialLoad || isNotesLoading /* Also check isNotesLoading for cache phase */) {
    const hasCriticalError = driveError || notesError;
    
    // Immediately exit loading state when offline
    if (!isOnline) {
      // Force immediate end of loading without timeout
      if (isInitialLoad) {
        setIsInitialLoad(false);
        initialLoadCompletedRef.current = true;
      }
      
      return (
        <>
          <ProgressBar
            progress={100}
            message="Using offline data"
          />
          <OfflineBadge />
        </>
      );
    }
    
    if (hasCriticalError && !isNotesLoading /* Show error only after cache attempt */) {
      return (
        <div className="min-h-screen bg-bg-primary flex flex-col items-center justify-center p-4 text-center">
          <h1 className="text-2xl font-semibold text-red-500 mb-4">
            Initialization Error
          </h1>
          <p className="text-text-primary/80 mb-2">
            Could not load required data.
          </p>
          <p className="text-sm text-text-primary/60 mb-6">
            {(driveError || notesError)?.message || 'Unknown error'}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 bg-overlay/10 hover:bg-overlay/20 px-4 py-2 rounded text-text-primary"
          >
            Retry
          </button>
          <OfflineBadge />
        </div>
      );
    } else {
      // Show progress bar during cache load OR initial drive check
       return (
         <>
           <ProgressBar
             progress={loadingState?.progress ?? (isDriveLoading ? 40 : (isNotesLoading ? 15 : 5))}
             message={loadingState?.message ?? (isDriveLoading ? 'Connecting Drive...' : (isNotesLoading ? 'Loading Notes...' : 'Initializing...'))}
           />
           <OfflineBadge />
         </>
       );
    }
  }

  // --- Initial Load Complete - Show App ---
  return (
    <ErrorBoundary fallback={<div>Something went wrong! Try refreshing.</div>}>
      <SyncProgressOverlay
        isSyncing={isManualSyncing}
        message={syncProgressMessage}
      />

      <Suspense
        fallback={<ProgressBar progress={-1} message="Loading page..." />}
      >
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/note/edit/:id" element={<NoteEditor />} />
          <Route path="/note/view/:id" element={<ViewNote />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/section/:id" element={<SectionView />} />
          <Route path="/create" element={<NoteEditor />} />
          <Route path="/login" element={<Navigate to="/" replace />} />
          <Route path="/auth/callback" element={<Navigate to="/" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
      <OfflineBadge />
      <SyncTriggerBadge
        hasPending={false}
        onSync={async () => {}}
        isSyncing={false}
        syncDiscrepancyDetected={false}
      />
      <SyncButton />
    </ErrorBoundary>
  );
}

function App() {
  const isOnline = useOnlineStatus();
  const [session, setSession] = useState(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true); // Tracks the whole sequence

  // Check for cached Supabase session in localStorage
  const supabaseStorageKey = findSupabaseLocalStorageKey();
  const hasLocalSession = supabaseStorageKey ? localStorage.getItem(supabaseStorageKey) : false;

  useEffect(() => {
    let mounted = true;
    // Check initial session
    supabase.auth
      .getSession()
      .then(({ data: { session: currentSession }, error }) => {
        if (mounted) {
          if (error) console.error('App: Error fetching initial session:', error);
          setSession(currentSession);
          // Only set isInitialLoad true if there *is* a session to load data for
          setIsInitialLoad(!!currentSession || !!hasLocalSession);
          setIsAuthLoading(false);
        }
      })
      .catch((err) => {
        if (mounted) {
          console.error('App: Exception fetching initial session:', err);
          setSession(null); setIsAuthLoading(false); setIsInitialLoad(false);
        }
      });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (!mounted) return;
      const wasAuth = !!session;
      const isAuth = !!newSession;
      setSession(newSession);
      setIsAuthLoading(false); // Auth state confirmed

      if (event === 'SIGNED_IN' && !wasAuth) setIsInitialLoad(true); // Start load sequence
      else if (event === 'SIGNED_OUT') setIsInitialLoad(false); // Stop load sequence
      else if (event === 'TOKEN_REFRESH_FAILED') {
        console.warn('Supabase token refresh failed, you might need to re-login');
        // Optionally handle this case (could redirect to login)
      }
      else if ((event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED') && isAuth && !wasAuth && !isInitialLoad) {
          // Handles cases where auth is confirmed after initial getSession check maybe failed
          setIsInitialLoad(true);
      } else if (!isAuth) {
          setIsInitialLoad(false); // Ensure false if not authenticated
      }
    });

    return () => { mounted = false; subscription?.unsubscribe(); };
  }, []); // Empty dependency array is correct here

  // Early return for logged out + offline
  if (!isAuthLoading && !session && !isOnline && !hasLocalSession) {
    return (
      <ToastProvider>
        <div className="min-h-screen bg-bg-primary flex flex-col items-center justify-center p-4 text-center">
          <h1 className="text-xl font-semibold text-text-primary mb-4">
            Offline
          </h1>
          <p className="text-text-primary/80">
            Please connect to the internet to log in or sign up.
          </p>
        </div>
        <OfflineBadge />
      </ToastProvider>
    );
  }

  return (
    <ToastProvider>
      <Router>
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
      </Router>
    </ToastProvider>
  );
}

export default App;