const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const CLIENT_SECRET = import.meta.env.VITE_GOOGLE_CLIENT_SECRET;

export class GoogleDriveAPI {
    constructor(accessToken) {
        this.accessToken = accessToken;
        this.baseUrl = 'https://www.googleapis.com/drive/v3';
        this.uploadUrl = 'https://www.googleapis.com/upload/drive/v3';
    }

    // Check network status before making API calls
    checkOnlineStatus() {
        if (!navigator.onLine) {
            throw new Error('Cannot perform this operation while offline');
        }
        return true;
    }

    async createFolder(name, parentId = null) {
        this.checkOnlineStatus();
        
        const metadata = {
            name,
            mimeType: 'application/vnd.google-apps.folder',
            ...(parentId && { parents: [parentId] })
        };

        try {
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
        } catch (error) {
            if (!navigator.onLine) {
                console.error('Failed to create folder due to network issues:', error);
                throw new Error('Cannot create folder while offline');
            }
            throw error;
        }
    }

    async uploadFile(file, folderId = null) {
        this.checkOnlineStatus();
        
        const metadata = {
            name: file.name,
            ...(folderId && { parents: [folderId] })
        };

        try {
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
        } catch (error) {
            if (!navigator.onLine) {
                console.error('Failed to upload file due to network issues:', error);
                throw new Error('Cannot upload file while offline');
            }
            throw error;
        }
    }

    async listFiles(folderId = null, query = null) {
        this.checkOnlineStatus();
        
        let queryComponents = [];
        if (folderId) queryComponents.push(`'${folderId}' in parents`);
        if (query) queryComponents.push(query);
        // Always add trashed=false to exclude trashed files
        queryComponents.push('trashed = false');
        
        const queryString = queryComponents.join(' and ');
        const url = new URL(`${this.baseUrl}/files`);
        url.searchParams.append('q', queryString);
        url.searchParams.append('fields', 'files(id, name, mimeType, modifiedTime)');
        url.searchParams.append('orderBy', 'modifiedTime desc');
        url.searchParams.append('pageSize', '100');

        try {
            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to list files: ${response.status} ${response.statusText}`);
            }

            return response.json();
        } catch (error) {
            if (!navigator.onLine) {
                console.error('Failed to list files due to network issues:', error);
                throw new Error('Cannot list files while offline');
            }
            throw error;
        }
    }

    async downloadFiles(fileIds) {
        if (!fileIds.length) return [];
        this.checkOnlineStatus();

        try {
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
                    if (!navigator.onLine) {
                        console.error('Download failed due to network issues:', err);
                    }
                    return null;
                }
            });

            const results = await Promise.all(downloads);
            const validResults = results.filter(blob => blob !== null);
            return validResults;
        } catch (error) {
            if (!navigator.onLine) {
                console.error('Failed to download files due to network issues:', error);
                throw new Error('Cannot download files while offline');
            }
            throw error;
        }
    }

    async deleteFile(fileId) {
        this.checkOnlineStatus();
        
        try {
            const response = await fetch(`${this.baseUrl}/files/${fileId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to delete file: ${response.status} ${response.statusText}`);
            }
        } catch (error) {
            if (!navigator.onLine) {
                console.error('Failed to delete file due to network issues:', error);
                throw new Error('Cannot delete file while offline');
            }
            throw error;
        }
    }

    async refreshProviderToken(refreshToken, clientId, clientSecret) {
        this.checkOnlineStatus();
        
        try {
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
        } catch (error) {
            if (!navigator.onLine) {
                console.error('Failed to refresh token due to network issues:', error);
                throw new Error('Cannot refresh token while offline');
            }
            throw error;
        }
    }
}

export const initGoogleDrive = async (session) => {
    if (!session?.provider_token) {
        throw new Error('No access token available');
    }
    return new GoogleDriveAPI(session.provider_token);
};