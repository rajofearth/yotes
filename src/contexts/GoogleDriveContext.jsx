import { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../utils/supabaseClient';
import { initGoogleDrive } from '../utils/googleDrive';
import { DriveStructureManager } from '../utils/driveStructure';

const GoogleDriveContext = createContext(null);

export function GoogleDriveProvider({ children }) {
    const [driveApi, setDriveApi] = useState(null);
    const [folderIds, setFolderIds] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const setupDrive = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                
                if (!session) {
                    navigate('/login');
                    return;
                }

                const api = await initGoogleDrive(session);
                const structureManager = new DriveStructureManager(api);
                const folders = await structureManager.initializeStructure();

                setDriveApi(api);
                setFolderIds(folders);
            } catch (error) {
                console.error('Failed to initialize Google Drive:', error);
                navigate('/login');
            } finally {
                setIsLoading(false);
            }
        };

        setupDrive();
    }, [navigate]);

    const contextValue = {
        driveApi,
        folderIds,
        isLoading
    };

    if (isLoading) {
        return <div>Loading...</div>;
    }

    return (
        <GoogleDriveContext.Provider value={contextValue}>
            {children}
        </GoogleDriveContext.Provider>
    );
}

export const useGoogleDrive = () => {
    const context = useContext(GoogleDriveContext);
    if (!context) {
        throw new Error('useGoogleDrive must be used within a GoogleDriveProvider');
    }
    return context;
}; 