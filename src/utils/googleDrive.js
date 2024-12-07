class GoogleDriveAPI {
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
            throw new Error('Failed to create folder');
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
            throw new Error('Failed to upload file');
        }

        return response.json();
    }

    async listFiles(folderId = null, pageSize = 100) {
        const query = folderId ? `'${folderId}' in parents` : '';
        const url = new URL(`${this.baseUrl}/files`);
        url.searchParams.append('pageSize', pageSize);
        url.searchParams.append('fields', 'files(id, name, mimeType, modifiedTime)');
        if (query) url.searchParams.append('q', query);

        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${this.accessToken}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to list files');
        }

        return response.json();
    }

    async downloadFile(fileId) {
        const response = await fetch(`${this.baseUrl}/files/${fileId}?alt=media`, {
            headers: {
                'Authorization': `Bearer ${this.accessToken}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to download file');
        }

        return response.blob();
    }

    async deleteFile(fileId) {
        const response = await fetch(`${this.baseUrl}/files/${fileId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${this.accessToken}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to delete file');
        }
    }
}

export const initGoogleDrive = async (session) => {
    if (!session?.provider_token) {
        throw new Error('No access token available');
    }

    return new GoogleDriveAPI(session.provider_token);
}; 