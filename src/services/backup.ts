import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import type { ExportNote, ExportTag, ExportProfile } from './exporter';
import { buildExportZip } from './exporter';
import { ensureYotesFolder, getAccessToken, uploadToFolder } from './gdrive';

export type BackupKind = 'manual' | 'auto';

export type BackupProgress = (message: string) => void;

export type BackupDeps = {
  convex: any;
  userId: Id<'users'>;
  dek: CryptoKey | null;
};

export type BackupData = {
  profile: ExportProfile;
  notes: ExportNote[];
  tags: ExportTag[];
};

const formatFileName = () => {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const name = `yotes-backup-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}.zip`;
  return name;
};

export const runBackup = async (
  deps: BackupDeps,
  data: BackupData,
  kind: BackupKind,
  onProgress?: BackupProgress
): Promise<{ success: boolean; fileId?: string; webViewLink?: string; bytes?: number; error?: string }> => {
  const report = (m: string) => { if (onProgress) onProgress(m); };
  const { convex, userId, dek } = deps;

  const startId = await convex.mutation(api.backups.startLog, { userId, kind });
  try {
    report('Building export...');
    const aiRaw = await convex.query(api.ai.getSettingsRaw, { userId });
    const blob = await buildExportZip({ dek, profile: data.profile, notes: data.notes, tags: data.tags, aiRaw });
    const bytes = blob.size;

    report('Preparing Google Drive...');
    const token = await getAccessToken();
    if (!token) throw new Error('Google access token not available');
    const folderId = await ensureYotesFolder(token);

    report('Uploading to Drive...');
    const fileName = formatFileName();
    const uploaded = await uploadToFolder(token, folderId, fileName, blob);

    await convex.mutation(api.backups.finishLog, {
      id: startId,
      status: 'success',
      bytes,
      driveFileId: uploaded.id,
      driveWebViewLink: uploaded.webViewLink,
    });
    return { success: true, fileId: uploaded.id, webViewLink: uploaded.webViewLink, bytes };
  } catch (e: any) {
    const message: string = e?.message || 'Backup failed';
    await convex.mutation(api.backups.finishLog, { id: startId, status: 'error', error: message });
    return { success: false, error: message };
  }
};


