import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../utils/supabaseClient';
import { setInDB, openDB } from '../../utils/indexedDB';

export default function AuthCallback() {
  const navigate = useNavigate();
  const [errorMessage, setErrorMessage] = useState(null);

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        await openDB();

        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
            const { error: refreshError } = await supabase.auth.refreshSession();
            if (refreshError) throw refreshError;

             const { data: { session: refreshedSession }, error: refreshedError } = await supabase.auth.getSession();
             if (refreshedError) throw refreshedError;

             if (!refreshedSession?.provider_token || !refreshedSession?.provider_refresh_token) {
                 throw new Error('Google authentication incomplete: Tokens missing.');
             }
              await setInDB('sessions', 'session', refreshedSession);
              navigate('/', { replace: true });


        } else if (!session?.provider_token || !session?.provider_refresh_token) {
             const { error: refreshError } = await supabase.auth.refreshSession();
             if (refreshError) throw refreshError;

             const { data: { session: refreshedSession }, error: refreshedError } = await supabase.auth.getSession();
             if (refreshedError) throw refreshedError;

             if (!refreshedSession?.provider_token || !refreshedSession?.provider_refresh_token) {
                 throw new Error('Google authentication incomplete: Tokens missing after refresh.');
             }
              await setInDB('sessions', 'session', refreshedSession);
              navigate('/', { replace: true });

        } else {
            await setInDB('sessions', 'session', session);
            navigate('/', { replace: true });
        }

      } catch (error) {
        setErrorMessage(`Authentication failed: ${error.message}`);
         navigate('/login', {
             replace: true,
             state: { error: `Authentication failed: ${error.message}` },
         });
      }
    };

    handleAuthCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center text-center p-4">
      <div className="text-text-primary">
        {errorMessage ? (
            <>
                <p className="text-red-500 font-semibold mb-2">Error</p>
                <p className="text-sm">{errorMessage}</p>
                <p className="text-xs mt-4">Redirecting to login...</p>
            </>
        ) : (
            'Completing sign in...'
        )}
      </div>
    </div>
  );
}