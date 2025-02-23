import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../utils/supabaseClient';

export default function AuthCallback() {
  const navigate = useNavigate();
  const [errorMessage, setErrorMessage] = useState(null);

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Attempt to get the session immediately
        let { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          console.error('Initial session error:', sessionError);
          throw sessionError;
        }

        // If no provider_token, force a refresh to complete the OAuth exchange
        if (!session?.provider_token) {
          console.log('No provider_token found, refreshing session...');
          const { error: refreshError } = await supabase.auth.refreshSession();
          if (refreshError) {
            throw new Error(`Refresh failed: ${refreshError.message}`);
          }

          // Re-fetch session after refresh
          const refreshed = await supabase.auth.getSession();
          session = refreshed.data.session;
          if (!session?.provider_token) {
            throw new Error('No access token received from Google after refresh');
          }
        }

        console.log('Auth callback succeeded with session:', session);
        navigate('/', { replace: true });
      } catch (error) {
        console.error('Auth callback error:', error);
        setErrorMessage(error.message);
        navigate('/login', {
          replace: true,
          state: { error: error.message || 'Authentication failed. Please try again.' },
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