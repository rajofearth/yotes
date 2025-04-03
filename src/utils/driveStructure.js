export const DRIVE_FOLDER_NAMES = {
    ROOT: 'Yotes App',
    NOTES: 'notes',
    TAGS: 'tags'
};

export const SAMPLE_NOTE = {
    id: 'welcome-note',
    title: 'Welcome to Yotes!',
    content: "This is your first note. You can edit it, tag it, or create new notes.\n\nYotes stores all your notes securely in your Google Drive.",
    tags: ['getting-started'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
};

export const SAMPLE_TAGS = [
    {
        id: 'getting-started',
        name: 'Getting Started',
        color: '#4f46e5'
    }
];

import { getFromDB, setInDB } from './indexedDB';

export class DriveStructureManager {
    constructor(driveApi) {
        this.driveApi = driveApi;
        this.folderIds = {};
    }

    async initializeStructure() {
        try {
            // Check if we're online
            const isOnline = navigator.onLine;
            
            // Try to get cached folder IDs first
            const cachedFolderIds = await getFromDB('sessions', 'folder_ids');
            
            // If offline and we have cached folder IDs, use them
            if (!isOnline) {
                if (cachedFolderIds) {
                    console.log('Using cached folder IDs due to offline status');
                    this.folderIds = cachedFolderIds;
                    return cachedFolderIds;
                } else {
                    throw new Error('No cached folder structure available while offline');
                }
            }
            
            // Online flow - continue with normal initialization
            // First check if root folder exists - if it does, user is not new
            const existingRoot = await this.findFolder(DRIVE_FOLDER_NAMES.ROOT);
            const isNewUser = !existingRoot;

            // Create or get root folder
            const rootFolder = existingRoot || await this.createFolder(DRIVE_FOLDER_NAMES.ROOT);
            this.folderIds.root = rootFolder.id;

            // Create or get subfolders
            const notesFolder = await this.findOrCreateFolder(DRIVE_FOLDER_NAMES.NOTES, rootFolder.id);
            const tagsFolder = await this.findOrCreateFolder(DRIVE_FOLDER_NAMES.TAGS, rootFolder.id);

            this.folderIds.notes = notesFolder.id;
            this.folderIds.tags = tagsFolder.id;

            // Cache the folder IDs for offline use
            await setInDB('sessions', 'folder_ids', this.folderIds);

            // Only create sample content for new users
            if (isNewUser) {
                await this.createSampleContent();
            }

            return this.folderIds;
        } catch (error) {
            console.error('Failed to initialize drive structure:', error);
            throw error;
        }
    }

    async findFolder(name, parentId = null) {
        if (!navigator.onLine) {
            throw new Error('Cannot search for folders while offline');
        }
        
        try {
            const query = `name = '${name}' and mimeType = 'application/vnd.google-apps.folder'${
                parentId ? ` and '${parentId}' in parents` : ''
            }`;
            const url = new URL(`${this.driveApi.baseUrl}/files`);
            url.searchParams.append('q', query);
            url.searchParams.append('fields', 'files(id, name)');

            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${this.driveApi.accessToken}`
                }
            });

            const { files } = await response.json();
            return files[0] || null;
        } catch (error) {
            if (!navigator.onLine) {
                console.error('Network error while offline:', error);
                throw new Error('Cannot search for folders while offline');
            }
            throw error;
        }
    }

    async createFolder(name, parentId = null) {
        if (!navigator.onLine) {
            throw new Error('Cannot create folders while offline');
        }
        return this.driveApi.createFolder(name, parentId);
    }

    async findOrCreateFolder(name, parentId = null) {
        if (!navigator.onLine) {
            throw new Error('Cannot find or create folders while offline');
        }
        const existing = await this.findFolder(name, parentId);
        return existing || await this.createFolder(name, parentId);
    }

    async createSampleContent() {
        if (!navigator.onLine) {
            console.log('Skipping sample content creation while offline');
            return;
        }
        
        try {
            // Check if sample note already exists
            const notesResponse = await this.driveApi.listFiles(this.folderIds.notes);
            const existingSampleNote = notesResponse.files.find(file => file.name === `${SAMPLE_NOTE.id}.json`);
            
            // Only create sample note if it doesn't exist
            if (!existingSampleNote) {
                // Create sample note
                const noteContent = JSON.stringify(SAMPLE_NOTE, null, 2);
                const noteBlob = new Blob([noteContent], { type: 'application/json' });
                const noteFile = new File([noteBlob], `${SAMPLE_NOTE.id}.json`, { type: 'application/json' });
                await this.driveApi.uploadFile(noteFile, this.folderIds.notes);
            }

            // Check if tags file already exists
            const tagsResponse = await this.driveApi.listFiles(this.folderIds.tags);
            const existingTagsFile = tagsResponse.files.find(file => file.name === 'tags.json');

            // Only create tags file if it doesn't exist
            if (!existingTagsFile) {
                // Create sample tags
                const tagsContent = JSON.stringify(SAMPLE_TAGS, null, 2);
                const tagsBlob = new Blob([tagsContent], { type: 'application/json' });
                const tagsFile = new File([tagsBlob], 'tags.json', { type: 'application/json' });
                await this.driveApi.uploadFile(tagsFile, this.folderIds.tags);
            }
        } catch (error) {
            console.error('Error creating sample content:', error);
            throw error;
        }
    }
} 