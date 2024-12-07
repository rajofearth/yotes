import { useState } from 'react';
import { useGoogleDrive } from '../contexts/GoogleDriveContext';

export function FileUpload() {
    const [isUploading, setIsUploading] = useState(false);
    const driveApi = useGoogleDrive();

    const handleFileUpload = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        setIsUploading(true);
        try {
            await driveApi.uploadFile(file);
            // Handle successful upload
        } catch (error) {
            console.error('Upload failed:', error);
            // Handle error
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <input 
            type="file" 
            onChange={handleFileUpload}
            disabled={isUploading}
        />
    );
} 