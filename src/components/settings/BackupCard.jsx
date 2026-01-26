import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useConvex, useQuery, useConvexAuth } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Clock, HardDriveUpload, RefreshCcw, CheckCircle2, XCircle } from 'lucide-react';
import { useNotes } from '../../hooks/useNotes';
import { runBackup } from '../../services/backup';
import { authClient } from '../../lib/auth-client';

const SIX_HOURS = 6 * 60 * 60 * 1000;

export default function BackupCard({ user }) {
  const convex = useConvex();
  const { isAuthenticated } = useConvexAuth();
  const sessionState = authClient.useSession();
  const hasSession = Boolean(sessionState.data?.user?.id);
  const { notes, tags, convexUserId, isE2EEReady } = useNotes();
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [progress, setProgress] = useState('');
  const lastSuccessAt = useQuery(api.backups.getLastSuccessAt, convexUserId ? { userId: convexUserId } : 'skip');
  const history = useQuery(api.backups.listByUser, convexUserId ? { userId: convexUserId, limit: 10 } : 'skip');
  const lastAutoCheckRef = useRef(0);

  const profile = useMemo(() => ({
    externalId: user?.id || null,
    email: user?.email || null,
    displayName: user?.name || null,
  }), [user]);

  const doBackup = useCallback(async (kind) => {
    if (!isAuthenticated || !hasSession || !convexUserId || !isE2EEReady) return;
    setIsBackingUp(true);
    setProgress('Starting...');
    try {
      const dek = window.__yotesDek || null;
      const result = await runBackup(
        { convex, userId: convexUserId, dek },
        { profile, notes, tags },
        kind,
        (msg) => setProgress(msg)
      );
      if (!result.success) throw new Error(result.error || 'Backup failed');
      setProgress('Backup completed');
    } catch (e) {
      setProgress(e?.message || 'Backup failed');
    } finally {
      setTimeout(() => setProgress(''), 3000);
      setIsBackingUp(false);
    }
  }, [convex, convexUserId, isE2EEReady, notes, tags, profile, isAuthenticated, hasSession]);

  useEffect(() => {
    if (!isAuthenticated || !hasSession || !convexUserId || !isE2EEReady) return;
    const now = Date.now();
    if (now - lastAutoCheckRef.current < 60 * 1000) return; // throttle check
    lastAutoCheckRef.current = now;
    const last = typeof lastSuccessAt === 'number' ? lastSuccessAt : null;
    // Auto backup strictly only when previous success exists AND >= 6 hours have passed
    if (last && now - last >= SIX_HOURS) {
      doBackup('auto');
    }
  }, [convexUserId, isE2EEReady, lastSuccessAt, doBackup, isAuthenticated, hasSession]);

  return (
    <Card className="bg-overlay/5 border-overlay/10">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <span>Backups</span>
          <Button onClick={() => doBackup('manual')} disabled={isBackingUp} className="bg-primary hover:bg-primary/90" type="button">
            {isBackingUp ? <RefreshCcw className="h-4 w-4 mr-2 animate-spin" /> : <HardDriveUpload className="h-4 w-4 mr-2" />}
            {isBackingUp ? 'Backing up...' : 'Backup Now'}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {progress ? (
          <div className="text-sm text-text-primary/80">{progress}</div>
        ) : (
          <div className="text-sm text-text-primary/60">Automatic backups run every 6 hours when you open the app.</div>
        )}

        <div className="space-y-2">
          <div className="text-sm font-medium text-text-primary/80 flex items-center gap-2"><Clock className="h-4 w-4" /> Recent Backups</div>
          <ul className="text-sm divide-y divide-overlay/10 rounded-md overflow-hidden border border-overlay/10">
            {Array.isArray(history) && history.length > 0 ? history.map((b) => (
              <li key={b._id} className="p-2 sm:p-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {b.status === 'success' ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : b.status === 'error' ? <XCircle className="h-4 w-4 text-red-500" /> : <RefreshCcw className="h-4 w-4 text-yellow-500" />}
                  <div>
                    <div className="text-text-primary/90">{b.kind === 'manual' ? 'Manual' : 'Auto'} • {new Date(b.finishedAt || b.startedAt).toLocaleString()}</div>
                    <div className="text-text-primary/60 text-xs">{b.bytes ? `${(b.bytes / (1024 * 1024)).toFixed(2)} MB` : ''} {b.driveWebViewLink ? <a href={b.driveWebViewLink} target="_blank" rel="noopener noreferrer" className="underline text-primary">Open in Drive</a> : ''}</div>
                  </div>
                </div>
                <div className="text-xs text-text-primary/60">{b.status}</div>
              </li>
            )) : (
              <li className="p-3 text-text-primary/60">No backups yet.</li>
            )}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}


