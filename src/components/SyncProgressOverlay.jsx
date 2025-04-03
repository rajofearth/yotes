import React from 'react';
import { Loader2 } from 'lucide-react';

export function SyncProgressOverlay({ isSyncing, message }) {
  if (!isSyncing) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm text-white p-4 transition-opacity duration-300">
      <Loader2 className="h-12 w-12 animate-spin mb-6 text-gray-400" />
      <p className="text-lg font-semibold mb-2">Syncing with Google Drive...</p>
      <p className="text-sm text-gray-300 text-center max-w-md">
        {message || 'Processing changes...'}
      </p>
    </div>
  );
}