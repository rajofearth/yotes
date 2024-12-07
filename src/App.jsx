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

function App() {
  const [session, setSession] = useState(null)
  const [toast, setToast] = useState(null)

  useEffect(() => {
    // Check active sessions and set up auth listener
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  // Check system preference and set dark mode
  useEffect(() => {
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      document.documentElement.classList.add('dark')
    }
  }, [])

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
  }

  return (
    <Router>
      <ToastProvider>
        <Routes>
          <Route
            path="/"
            element={
              session ? (
                <GoogleDriveProvider>
                  <Home />
                </GoogleDriveProvider>
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
          <Route
            path="/note/:id"
            element={
              session ? (
                <GoogleDriveProvider>
                  <NoteDetail />
                </GoogleDriveProvider>
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
          <Route
            path="/login"
            element={
              !session ? (
                <Login showToast={showToast} />
              ) : (
                <Navigate to="/" replace />
              )
            }
          />
          <Route
            path="/signup"
            element={
              !session ? (
                <Signup showToast={showToast} />
              ) : (
                <Navigate to="/" replace />
              )
            }
          />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route
            path="/create"
            element={
              session ? (
                <GoogleDriveProvider>
                  <CreateNote />
                </GoogleDriveProvider>
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </ToastProvider>

      <Analytics />
    </Router>
  )
}

export default App
