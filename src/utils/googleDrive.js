const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const CLIENT_SECRET = import.meta.env.VITE_GOOGLE_CLIENT_SECRET;

export class GoogleDriveAPI {
    constructor(accessToken) {
        this.accessToken = accessToken;
        this.baseUrl = 'https://www.googleapis.com/drive/v3';
        this.uploadUrl = 'https://www.googleapis.com/upload/drive/v3';
    }

    async createFolder(name, parentId = null) {
        const metadata = {
            name,
            mimeType: 'application/vnd.google-apps.folder',
            ...(parentId && { parents: [parentId] })
        };

        const response = await fetch(`${this.baseUrl}/files`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(metadata)
        });

        if (!response.ok) {
            throw new Error(`Failed to create folder: ${response.status} ${response.statusText}`);
        }

        return response.json();
    }

    async uploadFile(file, folderId = null) {
        const metadata = {
            name: file.name,
            ...(folderId && { parents: [folderId] })
        };

        const form = new FormData();
        form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
        form.append('file', file);

        const response = await fetch(`${this.uploadUrl}/files?uploadType=multipart`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.accessToken}`,
            },
            body: form
        });

        if (!response.ok) {
            throw new Error(`Failed to upload file: ${response.status} ${response.statusText}`);
        }

        return response.json();
    }

    async listFiles(folderId = null, pageSize = 100) {
        const query = folderId ? `'${folderId}' in parents and trashed = false` : 'trashed = false';
        const url = new URL(`${this.baseUrl}/files`);
        url.searchParams.append('pageSize', pageSize);
        url.searchParams.append('fields', 'files(id, name, modifiedTime)');
        url.searchParams.append('orderBy', 'modifiedTime desc');
        url.searchParams.append('q', query);

        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${this.accessToken}`
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to list files: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        return data;
    }

    async downloadFiles(fileIds) {
        if (!fileIds.length) return [];

        const downloads = fileIds.map(async fileId => {
            try {
                const response = await fetch(`${this.baseUrl}/files/${fileId}?alt=media`, {
                    headers: {
                        'Authorization': `Bearer ${this.accessToken}`
                    }
                });

                if (!response.ok) return null;

                const blob = await response.blob();
                return blob;
            } catch (err) {
                return null;
            }
        });

        const results = await Promise.all(downloads);
        const validResults = results.filter(blob => blob !== null);
        return validResults;
    }

    async deleteFile(fileId) {
        const response = await fetch(`${this.baseUrl}/files/${fileId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${this.accessToken}`
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to delete file: ${response.status} ${response.statusText}`);
        }
    }

    async refreshProviderToken(refreshToken, clientId, clientSecret) {
        const response = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
                grant_type: 'refresh_token',
                refresh_token: refreshToken,
                client_id: clientId,
                client_secret: clientSecret
            })
        });

        if (!response.ok) {
            throw new Error(`Failed to refresh token: ${response.statusText}`);
        }

        const data = await response.json();
        return {
            provider_token: data.access_token,
            expires_in: data.expires_in
        };
    }
}

export const initGoogleDrive = async (session) => {
    if (!session?.provider_token) {
        throw new Error('No access token available');
    }
    return new GoogleDriveAPI(session.provider_token);
};