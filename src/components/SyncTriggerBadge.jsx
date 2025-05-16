import React from 'react';
import { Button } from './ui/button';
import { UploadCloud, WifiOff, CloudDownload } from 'lucide-react';
import { useOnlineStatus } from '../contexts/OnlineStatusContext';
import { useToast } from '../contexts/ToastContext';

export function SyncTriggerBadge({ hasPending, onSync, isSyncing, syncDiscrepancyDetected }) {
  const isOnline = useOnlineStatus();
  const showToast = useToast();

  // Hide badge when nothing to sync or a sync is already in progress
  if ((!hasPending && !syncDiscrepancyDetected) || isSyncing) {
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
    ? syncDiscrepancyDetected 
      ? 'Data discrepancy detected. Click to sync with Google Drive'
      : 'Sync pending changes with Google Drive'
    : 'Connect to internet to sync';

  return (
    <Button
      onClick={handleClick}
      disabled={!isOnline || isSyncing}
      className={`fixed bottom-16 sm:bottom-4 right-4 z-50 h-10 px-3 rounded-full shadow-lg transition-all duration-300 flex items-center gap-2 ${
        isOnline
          ? syncDiscrepancyDetected
            ? 'bg-yellow-600 hover:bg-yellow-700 text-white'
            : 'bg-blue-600 hover:bg-blue-700 text-white'
          : 'bg-gray-600 hover:bg-gray-700 text-gray-300 cursor-not-allowed opacity-80'
      }`}
      aria-label={buttonTitle}
      title={buttonTitle}
    >
      {!isOnline ? (
        <WifiOff className="h-4 w-4 text-yellow-400" />
      ) : syncDiscrepancyDetected ? (
        <CloudDownload className="h-4 w-4" />
      ) : (
        <UploadCloud className="h-4 w-4" />
      )}
      <span className="text-xs font-medium">
        {syncDiscrepancyDetected ? 'Sync Required' : 'Sync Changes'}
      </span>
    </Button>
  );
}