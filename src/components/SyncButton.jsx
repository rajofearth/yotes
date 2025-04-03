import React, { useState, useEffect } from 'react';
import { useNotes } from '../hooks/useNotes';
import { useOnlineStatus } from '../contexts/OnlineStatusContext';
import { CloudCog, Loader2 } from 'lucide-react';
import { getSyncQueue } from '../utils/indexedDB';

const SyncButton = () => {
  const { 
    hasPendingChanges, 
    manualSyncWithDrive, 
    isManualSyncing,
    syncProgressMessage
  } = useNotes();
  
  const isOnline = useOnlineStatus();
  const [isAnimating, setIsAnimating] = useState(false);
  const [hasLocalChanges, setHasLocalChanges] = useState(false);
  
  // Check sync queue directly to confirm changes
  useEffect(() => {
    const checkSyncQueue = async () => {
      try {
        const queue = await getSyncQueue();
        setHasLocalChanges(queue.length > 0);
      } catch (err) {
        // Silent error - we'll rely on hasPendingChanges if this fails
      }
    };
    
    checkSyncQueue();
    const interval = setInterval(checkSyncQueue, 5000);
    return () => clearInterval(interval);
  }, []);
  
  // Add animation effect when changes are pending
  useEffect(() => {
    if (hasPendingChanges || hasLocalChanges) {
      setIsAnimating(true);
      const timer = setTimeout(() => setIsAnimating(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [hasPendingChanges, hasLocalChanges]);
  
  const shouldShowButton = (hasPendingChanges || hasLocalChanges);
  
  if (!shouldShowButton) {
    return null;
  }
  
  // Show a different button when syncing
  if (isManualSyncing) {
    return (
      <div
        className="fixed bottom-24 right-4 z-50 
          bg-bg-primary text-text-primary/80
          rounded-full p-4 shadow-lg 
          flex items-center gap-2
          ring-1 ring-overlay/20"
        title={syncProgressMessage || "Syncing with Google Drive..."}
      >
        <Loader2 className="h-5 w-5 text-blue-400 animate-spin" />
        <span className="text-xs whitespace-nowrap pr-1 max-w-[120px] overflow-hidden text-ellipsis">
          {syncProgressMessage ? syncProgressMessage.substring(0, 20) : "Syncing..."}
        </span>
      </div>
    );
  }
  
  return (
    <button 
      onClick={manualSyncWithDrive}
      disabled={!isOnline}
      className={`
        fixed bottom-24 right-4 z-50 
        bg-bg-primary text-text-primary 
        hover:bg-overlay/10 
        rounded-full p-4 shadow-lg 
        flex items-center justify-center 
        transition-all duration-300 
        ring-1 ring-overlay/20
        ${isAnimating ? 'animate-pulse' : ''} 
        disabled:opacity-50 disabled:pointer-events-none
      `}
      title={isOnline ? "Sync changes to Google Drive" : "Connect to internet to sync"}
    >
      <CloudCog className="h-6 w-6 text-gray-400" />
      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 flex items-center justify-center rounded-full">
        !
      </span>
    </button>
  );
};

export default SyncButton; 