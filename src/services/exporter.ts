import JSZip from 'jszip';
import type { E2EEUserMeta, EncBlob } from '../lib/e2ee';
import { decryptString } from '../lib/e2ee';

export type ExportNote = {
  id: string;
  title?: string;
  description?: string;
  content?: string;
  tags: string[];
  createdAt: number;
  updatedAt: number;
  titleEnc?: EncBlob;
  descriptionEnc?: EncBlob;
  contentEnc?: EncBlob;
};

export type ExportTag = {
  id: string;
  name?: string;
  color?: string;
  createdAt: number;
  updatedAt: number;
  nameEnc?: EncBlob;
  colorEnc?: EncBlob;
};

export type ExportProfile = {
  externalId: string | null;
  email: string | null;
  displayName: string | null;
};

export type AIRaw = { enabled?: boolean; apiKeyEnc?: EncBlob | null } | null;

export type BuildExportInput = {
  dek: CryptoKey | null;
  profile: ExportProfile;
  notes: ExportNote[];
  tags: ExportTag[];
  aiRaw: AIRaw;
};

export const buildExportZip = async (input: BuildExportInput): Promise<Blob> => {
  const { dek, profile } = input;
  const zip = new JSZip();

  const resolvedNotes = await Promise.all(
    input.notes.map(async (n) => {
      if (n.title !== undefined || !dek) return n;
      try {
        const title = n.titleEnc ? await decryptString(dek, n.titleEnc) : undefined;
        const description = n.descriptionEnc ? await decryptString(dek, n.descriptionEnc) : undefined;
        const content = n.contentEnc ? await decryptString(dek, n.contentEnc) : undefined;
        return { ...n, title, description, content };
      } catch {
        return n;
      }
    })
  );

  const resolvedTags = await Promise.all(
    input.tags.map(async (t) => {
      if (t.name !== undefined || !dek) return t;
      try {
        const name = t.nameEnc ? await decryptString(dek, t.nameEnc) : undefined;
        const color = t.colorEnc ? await decryptString(dek, t.colorEnc) : undefined;
        return { ...t, name, color };
      } catch {
        return t;
      }
    })
  );

  const meta = { exportedAt: new Date().toISOString(), version: '1.0', format: 'yotes-export' } as const;

  zip.file('profile.json', JSON.stringify(profile, null, 2));
  zip.file(
    'notes.json',
    JSON.stringify(
      resolvedNotes.map((n) => ({ id: n.id, title: n.title || '', description: n.description || '', content: n.content || '', tags: n.tags || [], createdAt: n.createdAt, updatedAt: n.updatedAt })),
      null,
      2
    )
  );
  zip.file(
    'tags.json',
    JSON.stringify(
      resolvedTags.map((t) => ({ id: t.id, name: t.name || '', color: t.color || '', createdAt: t.createdAt, updatedAt: t.updatedAt })),
      null,
      2
    )
  );

  let ai: { enabled: boolean; apiKey: string | null } = { enabled: false, apiKey: null };
  try {
    if (input.aiRaw?.apiKeyEnc && input.dek) {
      ai = { enabled: !!input.aiRaw.enabled, apiKey: await decryptString(input.dek, input.aiRaw.apiKeyEnc) };
    } else {
      ai = { enabled: !!input.aiRaw?.enabled, apiKey: null };
    }
  } catch {
    ai = { enabled: !!input.aiRaw?.enabled, apiKey: null };
  }
  zip.file('ai.json', JSON.stringify(ai, null, 2));
  zip.file('meta.json', JSON.stringify(meta, null, 2));

  const blob = await zip.generateAsync({ type: 'blob' });
  return blob;
};


