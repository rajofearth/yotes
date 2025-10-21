import { useCallback, useEffect, useRef, useState } from 'react';
import { useConvex, useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useNotes } from '../hooks/useNotes';
import { runBackup } from '../services/backup';
import { useToast } from '../contexts/ToastContext';
import { createPeriodicSyncManager, checkPeriodicSyncSupport } from '../utils/periodicBackgroundSync';
import { listenForServiceWorkerMessages } from '../utils/backgroundSync';

const SIX_HOURS = 6 * 60 * 60 * 1000;
const BACKUP_SYNC_TAG = 'auto-backup';

export default function AutoBackupWatcher({ session }) {
  const convex = useConvex();
  const showToast = useToast();
  const { convexUserId, isE2EEReady, notes, tags } = useNotes();
  const lastSuccessAt = useQuery(api.backups.getLastSuccessAt, convexUserId ? { userId: convexUserId } : 'skip');
  const lastRunRef = useRef(0);
  const runningRef = useRef(false);
  const [syncMethod, setSyncMethod] = useState('unknown');
  const periodicSyncManagerRef = useRef(null);

  const profile = {
    externalId: session?.user?.id || null,
    email: session?.user?.email || null,
    displayName: session?.user?.user_metadata?.full_name || null,
  };

  const maybeRunAuto = useCallback(async () => {
    if (!convexUserId || !isE2EEReady || runningRef.current) return;
    const now = Date.now();
    if (now - lastRunRef.current < 60 * 1000) return; // throttle checks
    lastRunRef.current = now;
    const last = typeof lastSuccessAt === 'number' ? lastSuccessAt : null;
    // Auto backup strictly only when a previous successful backup exists AND >= 6 hours have passed
    if (!last || now - last < SIX_HOURS) return;
    runningRef.current = true;
    try {
      showToast('Starting automatic backup...', 'info');
      const dek = window.__yotesDek || null;
      const result = await runBackup(
        { convex, userId: convexUserId, dek },
        { profile, notes, tags },
        'auto'
      );
      if (result.success) {
        showToast('Backup completed and saved to Google Drive', 'success');
      } else {
        showToast(result.error || 'Automatic backup failed', 'error');
      }
    } finally {
      runningRef.current = false;
    }
  }, [convex, convexUserId, isE2EEReady, lastSuccessAt, notes, tags, profile, showToast]);

  // Handle service worker messages for backup triggers
  useEffect(() => {
    const cleanup = listenForServiceWorkerMessages((message) => {
      if (message.type === 'TRIGGER_BACKUP' && message.source === 'periodic-sync') {
        console.log('Backup triggered by periodic sync');
        maybeRunAuto();
      }
    });

    return cleanup;
  }, [maybeRunAuto]);

  // Initialize periodic sync manager
  useEffect(() => {
    if (!convexUserId || !isE2EEReady) return;

    const isPeriodicSyncSupported = checkPeriodicSyncSupport();
    
    if (isPeriodicSyncSupported) {
      // Use native Periodic Background Sync
      periodicSyncManagerRef.current = createPeriodicSyncManager(
        BACKUP_SYNC_TAG,
        maybeRunAuto,
        { interval: SIX_HOURS, autoStart: true }
      );
      setSyncMethod('native');
    } else {
      // Fall back to timer-based approach
      periodicSyncManagerRef.current = createPeriodicSyncManager(
        BACKUP_SYNC_TAG,
        maybeRunAuto,
        { interval: SIX_HOURS, autoStart: true }
      );
      setSyncMethod('fallback');
    }

    return () => {
      if (periodicSyncManagerRef.current) {
        periodicSyncManagerRef.current.stop();
      }
    };
  }, [convexUserId, isE2EEReady, maybeRunAuto]);

  // Initial backup check (fallback for when periodic sync isn't available)
  useEffect(() => {
    if (syncMethod === 'fallback') {
      maybeRunAuto();
    }
  }, [maybeRunAuto, syncMethod]);

  // Debug info for development
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`AutoBackupWatcher: Using ${syncMethod} sync method`);
      if (periodicSyncManagerRef.current) {
        console.log('Periodic sync manager:', {
          isActive: periodicSyncManagerRef.current.isActive,
          isNative: periodicSyncManagerRef.current.isNative,
          isFallback: periodicSyncManagerRef.current.isFallback,
          tag: periodicSyncManagerRef.current.tag
        });
      }
    }
  }, [syncMethod]);

  return null;
}


