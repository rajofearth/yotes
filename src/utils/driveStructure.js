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

export class DriveStructureManager {
    constructor(driveApi) {
        this.driveApi = driveApi;
        this.folderIds = {};
    }

    async initializeStructure() {
        try {
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
    }

    async createFolder(name, parentId = null) {
        return this.driveApi.createFolder(name, parentId);
    }

    async findOrCreateFolder(name, parentId = null) {
        const existing = await this.findFolder(name, parentId);
        return existing || await this.createFolder(name, parentId);
    }

    async createSampleContent() {
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