import { useState } from 'react';
import { supabase } from '../utils/supabaseClient';

const GOOGLE_DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file';

export const useLoginLogic = (showToast, navigate) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          scopes: GOOGLE_DRIVE_SCOPE,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
            include_granted_scopes: 'true'
          }
        }
      });

      if (error) throw error;
    } catch (error) {
      showToast(error.message, 'error');
      setIsGoogleLoading(false);
    }
  };

  return {
    isLoading,
    isGoogleLoading,
    handleGoogleLogin
  };
};