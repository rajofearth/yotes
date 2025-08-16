import React from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { Button } from './ui/button';
import { RefreshCw } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';

function PWAReloadPrompt() {
  const showToast = useToast(); 
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
    
    },
    onRegisterError(error) {
      console.error('SW registration error:', error);
    },
  });

  const close = () => {
    setOfflineReady(false);
    setNeedRefresh(false);
  };

  // Show toast when offline ready
  React.useEffect(() => {
    if (offlineReady) {
      showToast('App is ready to work offline', 'success');
      // Optionally close the state automatically after showing toast
      // setTimeout(close, 5000); // Close after 5s
    }
  }, [offlineReady, showToast]);

  // Render refresh prompt only when needed
  if (!needRefresh) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 p-4 rounded-lg shadow-lg bg-bg-primary border border-overlay/20 text-text-primary">
      <div className="mb-2">
        <span>New content available, click refresh to update.</span>
      </div>
      <Button
        size="sm"
        className="mr-2 bg-overlay/10 hover:bg-overlay/20"
        onClick={() => updateServiceWorker(true)} // Pass true to reload the page
      >
        <RefreshCw className="mr-1 h-4 w-4" />
        Refresh
      </Button>
      <Button
        variant="outline"
        size="sm"
        className="bg-overlay/5 hover:bg-overlay/10"
        onClick={() => close()}
      >
        Close
      </Button>
    </div>
  );
}

export default PWAReloadPrompt;