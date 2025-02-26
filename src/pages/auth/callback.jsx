// src/pages/auth/callback.jsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../utils/supabaseClient';

export default function AuthCallback() {
  const navigate = useNavigate();
  const [errorMessage, setErrorMessage] = useState(null);

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        let { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;

        console.log('Initial session from callback:', {
          provider_token: session?.provider_token,
          provider_refresh_token: session?.provider_refresh_token,
          expires_at: session?.expires_at,
          access_token: session?.access_token,
          refresh_token: session?.refresh_token
        });

        if (!session?.provider_token || !session?.provider_refresh_token) {
          console.log('No provider tokens, attempting refresh...');
          const { error: refreshError } = await supabase.auth.refreshSession();
          if (refreshError) throw refreshError;
          const refreshed = await supabase.auth.getSession();
          session = refreshed.data.session;
          console.log('Refreshed session in callback:', {
            provider_token: session?.provider_token,
            provider_refresh_token: session?.provider_refresh_token,
            expires_at: session?.expires_at,
            access_token: session?.access_token,
            refresh_token: session?.refresh_token
          });
          if (!session?.provider_token || !session?.provider_refresh_token) {
            throw new Error('No Google tokens received after refresh');
          }
        }

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