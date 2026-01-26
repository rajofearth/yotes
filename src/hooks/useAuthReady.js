import { useConvexAuth } from 'convex/react';
import { authClient } from '../lib/auth-client';

export const useAuthReady = () => {
  const { isAuthenticated, isLoading: isConvexAuthLoading } = useConvexAuth();
  const sessionState = authClient.useSession();
  const hasSession = Boolean(sessionState.data?.user?.id);
  const isSessionLoading = Boolean(sessionState.isPending);
  const isAuthReadyForData = hasSession && isAuthenticated;

  return {
    hasSession,
    isAuthenticated,
    isConvexAuthLoading,
    isSessionLoading,
    isAuthReadyForData,
  };
};
