type DriveFileCreateResponse = {
  id: string;
  webViewLink?: string;
};

const DRIVE_API = 'https://www.googleapis.com/drive/v3';

export const getAccessToken = async (): Promise<string | null> => {
  try {
    const { authClient } = await import('../lib/auth-client');
    const { data, error } = await authClient.getAccessToken({
      providerId: 'google',
    });
    if (error) return null;
    return data?.accessToken ?? null;
  } catch {
    return null;
  }
};

export const ensureYotesFolder = async (accessToken: string): Promise<string> => {
  const headers = { Authorization: `Bearer ${accessToken}` } as const;
  const q = encodeURIComponent("name='Yotes' and mimeType='application/vnd.google-apps.folder' and trashed=false");
  const listRes = await fetch(`${DRIVE_API}/files?q=${q}&fields=files(id,name)`, { headers });
  if (listRes.ok) {
    const data = await listRes.json();
    if (Array.isArray(data.files) && data.files.length > 0) return data.files[0].id as string;
  }
  const meta = { name: 'Yotes', mimeType: 'application/vnd.google-apps.folder' };
  const createRes = await fetch(`${DRIVE_API}/files`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify(meta),
  });
  if (!createRes.ok) throw new Error('Failed to create Yotes folder');
  const created = await createRes.json();
  return created.id as string;
};

export const uploadToFolder = async (
  accessToken: string,
  folderId: string,
  fileName: string,
  blob: Blob
): Promise<DriveFileCreateResponse> => {
  const boundary = 'yotes-' + Math.random().toString(36).slice(2);
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const metadata = {
    name: fileName,
    parents: [folderId],
    mimeType: 'application/zip',
  };

  const headers = {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': `multipart/related; boundary=${boundary}`,
  } as const;

  const metaPart = new Blob([JSON.stringify(metadata)], { type: 'application/json' });
  const bodyParts = [
    delimiter,
    'Content-Type: application/json; charset=UTF-8\r\n\r\n',
    await metaPart.text(),
    '\r\n',
    `--${boundary}\r\n`,
    'Content-Type: application/zip\r\n\r\n',
    new Uint8Array(await blob.arrayBuffer()),
    closeDelimiter,
  ];

  const multipartBody = new Blob(bodyParts as any, { type: headers['Content-Type'] });

  const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink', {
    method: 'POST',
    headers,
    body: multipartBody,
  });
  if (!res.ok) throw new Error('Drive upload failed');
  return res.json();
};


