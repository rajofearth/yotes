import React from 'react';
import { Button } from './ui/button';
import { UploadCloud, WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../contexts/OnlineStatusContext';
import { useToast } from '../contexts/ToastContext';

export function SyncTriggerBadge({ hasPending, onSync, isSyncing }) {
  const isOnline = useOnlineStatus();
  const showToast = useToast();

  if (!hasPending || isSyncing) {
    // Hide if no pending changes or already syncing
    return null;
  }

  const handleClick = () => {
    if (!isOnline) {
      showToast('Connect to internet to sync.', 'info');
      return;
    }
    onSync();
  };

  const buttonTitle = isOnline
    ? 'Sync pending changes with Google Drive'
    : 'Connect to internet to sync';

  return (
    <Button
      onClick={handleClick}
      disabled={!isOnline || isSyncing}
      className={`fixed bottom-16 sm:bottom-4 right-4 z-50 h-10 px-3 rounded-full shadow-lg transition-all duration-300 flex items-center gap-2 ${
        isOnline
          ? 'bg-blue-600 hover:bg-blue-700 text-white'
          : 'bg-gray-600 hover:bg-gray-700 text-gray-300 cursor-not-allowed opacity-80'
      }`}
      aria-label={buttonTitle}
      title={buttonTitle}
    >
      {isOnline ? (
        <UploadCloud className="h-4 w-4" />
      ) : (
        <WifiOff className="h-4 w-4 text-yellow-400" />
      )}
      <span className="text-xs font-medium">Sync Required</span>
    </Button>
  );
}