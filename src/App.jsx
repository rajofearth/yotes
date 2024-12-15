import { useEffect, useState } from "react"
import { Analytics } from "@vercel/analytics/react"
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom"
import { supabase } from "./utils/supabaseClient"
import Home from "./pages/home"
import Login from "./pages/login"
import Signup from "./pages/signup"
import { Toast } from "./components/ui/toast"
import AuthCallback from './pages/auth/callback'
import { GoogleDriveProvider } from './contexts/GoogleDriveContext';
import EditNote from './pages/note/edit/[id]';
import ViewNote from "./pages/note/view/[id]"
import { ToastProvider } from './contexts/ToastContext';
import CreateNote from './pages/create';
import ErrorBoundary from './components/ErrorBoundary';
import { useNavigate } from 'react-router-dom'; // Import useNavigate

// Protected route component that includes necessary providers
function ProtectedRoute({ children, isLoading }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);

      // If no session, navigate here instead of using Navigate component
      if (!session) {
        navigate('/login', { replace: true });
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (!session && !loading) {
        navigate('/login', { replace: true });
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, loading]);

  if (loading || isLoading) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center">
        <div className="text-text-primary">Loading...</div>
      </div>
    );
  }

  // Remove the Navigate component and just return children if we have a session
  if (session) {
    return (
      <GoogleDriveProvider>
        <ErrorBoundary fallback={<div>Something went wrong with Google Drive integration</div>}>
          {children}
        </ErrorBoundary>
      </GoogleDriveProvider>
    );
  }

  // Return loading state while navigation happens
  return <div className="min-h-screen bg-bg-primary flex items-center justify-center">
    <div className="text-text-primary">Redirecting...</div>
  </div>;
}

function App() {
  const [session, setSession] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Check system preference and set dark mode
  useEffect(() => {
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      document.documentElement.classList.add('dark');
    }
  }, []);

  return (
    <Router>
      <ToastProvider>
        <Routes>
          <Route
            path="/"
            element={
              <ProtectedRoute isLoading={isDriveLoading || isNotesLoading}>
                <Home />
              </ProtectedRoute>
            }
          />
          <Route path="/note/edit/:id"
            element={
              <ProtectedRoute>
                <EditNote />
              </ProtectedRoute>
            }
          />
          <Route path="/note/view/:id"
            element={
              <ProtectedRoute>
                <ViewNote />
              </ProtectedRoute>
            }
          />
          <Route
            path="/login"
            element={
              !session ? (
                <Login />
              ) : (
                <Navigate to="/" replace />
              )
            }
          />
          <Route
            path="/signup"
            element={
              !session ? (
                <Signup />
              ) : (
                <Navigate to="/" replace />
              )
            }
          />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route
            path="/create"
            element={
              <ProtectedRoute>
                <CreateNote />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </ToastProvider>
      <Analytics />
    </Router>
  );
}

export default App