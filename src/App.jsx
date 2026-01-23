import React, { Suspense, lazy, useEffect, useState, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Analytics } from '@vercel/analytics/react';
import { ToastProvider, useToast } from './contexts/ToastContext';
import { NotesProvider, useNotes } from './contexts/NotesContext';
import { useOnlineStatus } from './contexts/OnlineStatusContext';
import { OfflineBadge } from './components/OfflineBadge';
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
import AutoBackupWatcher from './components/AutoBackupWatcher.jsx';
import { authClient } from './lib/auth-client';
import { getFromDB, openDB, setInDB } from './utils/indexedDB';

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

  // Logged In: Show Initial Loading / Error / App (only during initial load)
  if (isInitialLoad) {
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
    
    if (hasCriticalError && !isNotesLoading) {
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
       return (
         <>
           <ProgressBar
             progress={loadingState?.progress ?? 5}
             message={loadingState?.message ?? 'Initializing...'}
           />
           <OfflineBadge />
         </>
       );
    }
  }

  // --- Initial Load Complete - Show App ---
  return (
    <ErrorBoundary fallback={<div>Something went wrong! Try refreshing.</div>}>

      <Suspense
        fallback={null}
      >
        <AutoBackupWatcher session={session} />
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
      <SyncButton />
    </ErrorBoundary>
  );
}

function App() {
  const isOnline = useOnlineStatus();
  const sessionState = authClient.useSession();
  const session = sessionState.data ?? null;
  const isAuthLoading = sessionState.isPending;
  const [isInitialLoad, setIsInitialLoad] = useState(true); // Tracks the whole sequence
  const [hasLocalSession, setHasLocalSession] = useState(false);
  const [cachedSession, setCachedSession] = useState(null);
  const previousSessionRef = useRef(null);

  useEffect(() => {
    let mounted = true;
    const loadCachedSession = async () => {
      try {
        await openDB();
        const cachedSession = await getFromDB('sessions', 'session');
        if (!mounted) return;
        setHasLocalSession(Boolean(cachedSession?.user));
        setCachedSession(cachedSession ?? null);
      } catch {
        if (mounted) setHasLocalSession(false);
      }
    };
    loadCachedSession();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const currentSession = session ?? cachedSession;
    const wasAuth = Boolean(previousSessionRef.current);
    const isAuth = Boolean(currentSession);

    if (!isAuthLoading) {
      if (!wasAuth && isAuth) {
        setIsInitialLoad(true);
      } else if (!isAuth) {
        setIsInitialLoad(false);
      }
    }

    previousSessionRef.current = currentSession;
  }, [session, cachedSession, isAuthLoading]);

  useEffect(() => {
    if (!session) return;
    setInDB('sessions', 'session', session).catch(() => {});
    setCachedSession(session);
  }, [session]);

  const effectiveSession = session ?? cachedSession;

  // Early return for logged out + offline
  if (!isAuthLoading && !effectiveSession && !isOnline && !hasLocalSession) {
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
          <NotesProvider session={!isAuthLoading ? effectiveSession : undefined}>
            <AppContent
              session={effectiveSession}
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