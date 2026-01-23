import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authClient } from '../../lib/auth-client';

export default function AuthCallback() {
  const navigate = useNavigate();
  const sessionState = authClient.useSession();

  useEffect(() => {
    if (sessionState.isPending) return;
    if (sessionState.data) {
      navigate('/', { replace: true });
      return;
    }
    navigate('/login', { replace: true });
  }, [navigate, sessionState.data, sessionState.isPending]);

  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center text-center p-4">
      <div className="text-text-primary">
        Completing sign in...
      </div>
    </div>
  );
}