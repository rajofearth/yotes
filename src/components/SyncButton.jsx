import React, { useState, useEffect } from 'react';
import { useNotes } from '../hooks/useNotes';
import { useOnlineStatus } from '../contexts/OnlineStatusContext';
import { Loader2, RefreshCw, Upload, Download } from 'lucide-react';
// Drive/IndexedDB removed with Convex migration
// import { getSyncQueue } from '../utils/indexedDB';
import { useToast } from '../contexts/ToastContext';

const SyncButton = () => {
  const { 
    hasPendingChanges, 
    manualSyncWithDrive, 
    isManualSyncing,
    syncProgressMessage,
    checkSyncDiscrepancies
  } = useNotes();
  
  const isOnline = useOnlineStatus();
  const showToast = useToast();
  const [isAnimating, setIsAnimating] = useState(false);
  const [hasLocalChanges, setHasLocalChanges] = useState(false);
  const [syncDiscrepancyDetected, setSyncDiscrepancyDetected] = useState(false);
  const [isCheckingSync, setIsCheckingSync] = useState(false);
  
  // Check sync queue directly to confirm changes
  useEffect(() => {
    setHasLocalChanges(false);
  }, []);
  
  // Check for sync discrepancies between IndexedDB and Drive
  useEffect(() => {
    let cancelled = false;
    if (!isOnline) {
      setSyncDiscrepancyDetected(false);
      return;
    }
    
    const checkDiscrepanciesLoop = async () => {
      if (isManualSyncing) return; // Skip check if already syncing
      
      try {
        // Force deep check via hook
        const syncNeeded = await checkSyncDiscrepancies(true);
        if (!cancelled) setSyncDiscrepancyDetected(syncNeeded);
        console.log('[SyncButton] Discrepancy check result:', syncNeeded);
      } catch (err) {
        console.error("Error checking sync discrepancies:", err);
      }
    };
    
    checkDiscrepanciesLoop();
    const interval = setInterval(checkDiscrepanciesLoop, 5000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [isOnline, isManualSyncing, checkSyncDiscrepancies]);
  
  // Add animation effect when changes are pending
  useEffect(() => {
    if (hasPendingChanges || hasLocalChanges || syncDiscrepancyDetected) {
      setIsAnimating(true);
      const timer = setTimeout(() => setIsAnimating(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [hasPendingChanges, hasLocalChanges, syncDiscrepancyDetected]);

  // Handle manual sync based on what type of changes we have, and clear pull indicator when done
  const handleSync = async () => {
    // Just call manualSyncWithDrive directly - it will handle both push and pull operations
    await manualSyncWithDrive();
    // After syncing, hide pull button immediately
    setSyncDiscrepancyDetected(false);
  };

  // Manually check for sync discrepancies
  const handleForceCheck = async (e) => {
    e.stopPropagation();
    if (!isOnline || isCheckingSync || isManualSyncing) {
      return;
    }
    
    setIsCheckingSync(true);
    try {
      showToast('Checking for remote changes...', 'info');
      
      // Deep check for discrepancies via hook
      const syncNeeded = await checkSyncDiscrepancies(true);
      setSyncDiscrepancyDetected(syncNeeded);
      console.log('[SyncButton] Manual check result:', syncNeeded);
      
      if (syncNeeded) {
        showToast('Found changes from other devices!', 'success');
      } else {
        showToast('No new changes found', 'info');
      }
    } catch (err) {
      console.error("Error during manual sync check:", err);
      showToast('Error checking for changes', 'error');
    } finally {
      setIsCheckingSync(false);
    }
  };
  
  // Show spinner when syncing
  if (isManualSyncing) {
    return (
      <div
        className="fixed bottom-24 right-4 z-50 
          bg-bg-primary text-text-primary/80
          rounded-full p-4 shadow-lg 
          flex items-center gap-2
          ring-1 ring-overlay/20"
        title={syncProgressMessage || "Syncing with Google Drive..."}
        role="status"
        aria-label="Syncing with Google Drive"
      >
        <Loader2 className="h-5 w-5 text-blue-400 animate-spin" />
        <span className="text-xs whitespace-nowrap pr-1 max-w-[120px] overflow-hidden text-ellipsis">
          {syncProgressMessage ? syncProgressMessage.substring(0, 20) : "Syncing..."}
        </span>
      </div>
    );
  }
  
  // Determine what button to show (only one at a time)
  const hasLocalOnly = (hasPendingChanges || hasLocalChanges) && !syncDiscrepancyDetected;
  const hasRemoteOnly = !hasLocalOnly && syncDiscrepancyDetected;
  const noChangeDetected = !hasLocalOnly && !hasRemoteOnly && !isCheckingSync;
  
  // If there are local changes to upload (takes priority)
  if (hasLocalOnly) {
    return (
      <button 
        onClick={handleSync}
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
        title={isOnline ? "Push local changes to Google Drive" : "Connect to internet to sync"}
      >
        <Upload className="h-5 w-5 text-gray-400" />
        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 flex items-center justify-center rounded-full">
          !
        </span>
      </button>
    );
  }
  
  // If there are remote changes to download
  if (hasRemoteOnly && isOnline) {
    return (
      <button 
        onClick={handleSync}
        className={`
          fixed bottom-24 right-4 z-50
          bg-bg-primary text-text-primary 
          hover:bg-overlay/10 
          rounded-full p-4 shadow-lg 
          flex items-center justify-center 
          transition-all duration-300 
          ring-1 ring-overlay/20
          ${isAnimating ? 'animate-pulse' : ''} 
        `}
        title="Pull updates from Google Drive"
      >
        <Download className="h-5 w-5 text-yellow-400" />
        <span className="absolute -top-1 -right-1 bg-yellow-500 text-white text-xs w-5 h-5 flex items-center justify-center rounded-full">
          !
        </span>
      </button>
    );
  }
  
  // If manually checking for changes
  if (isCheckingSync) {
    return (
      <button 
        disabled={true}
        className={`
          fixed bottom-24 right-4 z-50
          bg-bg-primary text-text-primary 
          rounded-full p-4 shadow-lg 
          flex items-center justify-center 
          transition-all duration-300 
          ring-1 ring-overlay/20
        `}
        title="Checking for changes..."
      >
        <Loader2 className="h-5 w-5 text-blue-400 animate-spin" />
      </button>
    );
  }
  
  // Default - show refresh button when online
  if (isOnline) {
    return (
      <button 
        onClick={handleForceCheck}
        className={`
          fixed bottom-24 right-4 z-50
          bg-bg-primary text-text-primary 
          hover:bg-overlay/10 
          rounded-full p-3 shadow-lg 
          flex items-center justify-center 
          transition-all duration-300 
          ring-1 ring-overlay/20
        `}
        title="Check for changes from other devices"
      >
        <RefreshCw className="h-4 w-4 text-gray-400" />
      </button>
    );
  }
  
  // No button to show
  return null;
};

export default SyncButton; 