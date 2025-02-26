// src/hooks/loginLogic.js
import { useState } from 'react';
import { supabase } from '../utils/supabaseClient';

const GOOGLE_DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file';

export const useLoginLogic = (showToast, navigate) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true);
    try {
      console.log('Initiating Google login with params:', {
        provider: 'google',
        redirectTo: `${window.location.origin}/auth/callback`,
        scopes: GOOGLE_DRIVE_SCOPE,
        queryParams: { access_type: 'offline', prompt: 'consent', include_granted_scopes: 'true' }
      });
      const { data, error } = await supabase.auth.signInWithOAuth({
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
      console.log('OAuth sign-in response:', data);
    } catch (error) {
      console.error('Google login error:', error);
      showToast(error.message, 'error');
      setIsGoogleLoading(false);
    }
  };

  return { isLoading, isGoogleLoading, handleGoogleLogin };
};