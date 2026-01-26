import { useCallback, useEffect, useRef } from 'react';
import { useConvex, useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useNotes } from '../hooks/useNotes';
import { runBackup } from '../services/backup';
import { useToast } from '../contexts/ToastContext';
import { useAuthReady } from '../hooks/useAuthReady';

const SIX_HOURS = 6 * 60 * 60 * 1000;

export default function AutoBackupWatcher({ session }) {
  const convex = useConvex();
  const showToast = useToast();
  const { hasSession, isAuthReadyForData } = useAuthReady();
  const { convexUserId, isE2EEReady, notes, tags } = useNotes();
  const lastSuccessAt = useQuery(api.backups.getLastSuccessAt, convexUserId ? { userId: convexUserId } : 'skip');
  const lastRunRef = useRef(0);
  const runningRef = useRef(false);

  const profile = {
    externalId: session?.user?.id || null,
    email: session?.user?.email || null,
    displayName: session?.user?.name || null,
  };

  const maybeRunAuto = useCallback(async () => {
    if (!hasSession || !isAuthReadyForData || !convexUserId || !isE2EEReady || runningRef.current) return;
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
  }, [convex, convexUserId, isE2EEReady, lastSuccessAt, notes, tags, profile, showToast, hasSession, isAuthReadyForData]);

  useEffect(() => {
    maybeRunAuto();
  }, [maybeRunAuto]);

  return null;
}


