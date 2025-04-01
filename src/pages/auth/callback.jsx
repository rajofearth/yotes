import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../utils/supabaseClient';
import { setInDB, openDB } from '../../utils/indexedDB'; // Ensure openDB is imported if not already

export default function AuthCallback() {
  const navigate = useNavigate();
  const [errorMessage, setErrorMessage] = useState(null);

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Ensure DB is ready before proceeding
        await openDB();

        // Let Supabase handle the session establishment from the URL hash
        // This should automatically update localStorage via the Supabase client library
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
            // If getSession fails immediately after redirect, try refreshing once
            console.warn("AuthCallback: getSession failed, trying refreshSession.", sessionError);
            const { error: refreshError } = await supabase.auth.refreshSession();
            if (refreshError) throw refreshError; // If refresh fails, throw error

            // Retry getting session after refresh
             const { data: { session: refreshedSession }, error: refreshedError } = await supabase.auth.getSession();
             if (refreshedError) throw refreshedError;

             if (!refreshedSession?.provider_token || !refreshedSession?.provider_refresh_token) {
                 console.error('AuthCallback Error: Google tokens still missing after refresh.');
                 throw new Error('Google authentication incomplete: Tokens missing.');
             }
              // Use the refreshed session
              await setInDB('sessions', 'session', refreshedSession);
              navigate('/', { replace: true });


        } else if (!session?.provider_token || !session?.provider_refresh_token) {
             // Sometimes getSession might succeed but tokens aren't immediately available
             console.warn('AuthCallback Warning: Google tokens missing initially, attempting refreshSession.');
             const { error: refreshError } = await supabase.auth.refreshSession();
             if (refreshError) throw refreshError;

             const { data: { session: refreshedSession }, error: refreshedError } = await supabase.auth.getSession();
             if (refreshedError) throw refreshedError;

             if (!refreshedSession?.provider_token || !refreshedSession?.provider_refresh_token) {
                 console.error('AuthCallback Error: Google tokens still missing after refresh.');
                 throw new Error('Google authentication incomplete: Tokens missing after refresh.');
             }
              await setInDB('sessions', 'session', refreshedSession);
              navigate('/', { replace: true });

        } else {
            // Session looks good on first try, save it to IndexedDB
            await setInDB('sessions', 'session', session);
            navigate('/', { replace: true });
        }

      } catch (error) {
        console.error('Auth callback error:', error);
        setErrorMessage(`Authentication failed: ${error.message}`);
        // Optional: Delay redirect slightly to show error
        // setTimeout(() => {
        //     navigate('/login', {
        //         replace: true,
        //         state: { error: `Authentication failed: ${error.message}` },
        //     });
        // }, 3000);
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