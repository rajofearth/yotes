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
import NoteDetail from './pages/note/[id]';
import { ToastProvider } from './contexts/ToastContext';
import CreateNote from './pages/create';
import ErrorBoundary from './components/ErrorBoundary';

// Protected route component that includes necessary providers
function ProtectedRoute({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return <div className="min-h-screen bg-bg-primary flex items-center justify-center">
      <div className="text-text-primary">Loading...</div>
    </div>;
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return (
    <GoogleDriveProvider>
      <ErrorBoundary fallback={<div>Something went wrong with Google Drive integration</div>}>
        {children}
      </ErrorBoundary>
    </GoogleDriveProvider>
  );
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
              <ProtectedRoute>
                <Home />
              </ProtectedRoute>
            }
          />
          <Route
            path="/note/:id"
            element={
              <ProtectedRoute>
                <NoteDetail />
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
