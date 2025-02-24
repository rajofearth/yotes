import { useEffect, useState } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useNavigate,
} from 'react-router-dom';
import { Analytics } from '@vercel/analytics/react';
import { supabase } from './utils/supabaseClient';
import { GoogleDriveProvider, useGoogleDrive } from './contexts/GoogleDriveContext';
import { ToastProvider } from './contexts/ToastContext';
import { useNotes } from './hooks/useNotes';
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

function ProtectedRoute({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { isLoading: isDriveLoading } = useGoogleDrive();
  const { isLoading: isNotesLoading, isSyncing, isInitialSync, error: notesError, loadingState } = useNotes();

  useEffect(() => {
    console.log('ProtectedRoute useEffect running...');
    supabase.auth.getSession()
      .then(({ data: { session }, error }) => {
        if (error) console.error('Session error:', error);
        setSession(session);
        setLoading(false);
        if (!session) {
          console.log('No session, redirecting to login');
          navigate('/login', { replace: true });
        }
        console.log('Session check complete:', { session: !!session });
      })
      .catch((err) => {
        console.error('Session fetch failed:', err);
        setLoading(false);
        navigate('/login', { replace: true });
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (!session && !loading) {
        navigate('/login', { replace: true });
      }
    });
    return () => subscription.unsubscribe();
  }, [navigate, loading]);

  // Show progress bar during initial load (session or notes) or initial Drive sync
  if (loading || isNotesLoading || (isSyncing && isInitialSync)) {
    console.log('ProtectedRoute loading state:', { loading, isDriveLoading, isNotesLoading });
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center">
        <ProgressBar progress={loadingState.progress} message={loadingState.message} />
      </div>
    );
  }

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

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    return () => subscription.unsubscribe();
  }, []);

  return (
    <ToastProvider>
      <Router>
        <GoogleDriveProvider>
          <Routes>
            <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
            <Route path="/note/edit/:id" element={<ProtectedRoute><EditNote /></ProtectedRoute>} />
            <Route path="/note/view/:id" element={<ProtectedRoute><ViewNote /></ProtectedRoute>} />
            <Route path="/section/:id" element={<ProtectedRoute><SectionView /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
            <Route path="/login" element={!session ? <Login /> : <Navigate to="/" replace />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/create" element={<ProtectedRoute><CreateNote /></ProtectedRoute>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <Analytics />
        </GoogleDriveProvider>
      </Router>
    </ToastProvider>
  );
}

export default App;