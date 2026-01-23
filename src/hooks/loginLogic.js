import { useState } from 'react';
import { authClient } from '../lib/auth-client';

export const useLoginLogic = (showToast, navigate) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true);
    try {
      const { error } = await authClient.signIn.social({
        provider: 'google',
      });
      if (error) throw error;
    } catch (error) {
      showToast(error.message, 'error');
      setIsGoogleLoading(false);
    }
  };

  return { isLoading, isGoogleLoading, handleGoogleLogin };
};