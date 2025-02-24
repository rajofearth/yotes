// src/pages/auth/callback.jsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../utils/supabaseClient';
import { setInDB } from '../../utils/indexedDB'; // Added missing import

export default function AuthCallback() {
  const navigate = useNavigate();
  const [errorMessage, setErrorMessage] = useState(null);

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        let { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;

        if (!session?.provider_token || !session?.provider_refresh_token) {
          const { error: refreshError } = await supabase.auth.refreshSession();
          if (refreshError) throw refreshError;
          const refreshed = await supabase.auth.getSession();
          session = refreshed.data.session;
          if (!session?.provider_token || !session?.provider_refresh_token) {
            throw new Error('No Google tokens received');
          }
        }

        await setInDB('sessions', 'session', session); // Ensure session is saved
        navigate('/', { replace: true });
      } catch (error) {
        console.error('Auth callback error:', error);
        setErrorMessage(error.message);
        navigate('/login', {
          replace: true,
          state: { error: error.message || 'Authentication failed' },
        });
      }
    };

    handleAuthCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center">
      <div className="text-text-primary">
        {errorMessage ? `Error: ${errorMessage}` : 'Completing sign in...'}
      </div>
    </div>
  );
}