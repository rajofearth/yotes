import React, { createContext, useContext, useState, useEffect } from 'react';

const OnlineStatusContext = createContext(true);

export function OnlineStatusProvider({ children }) {
    const [isOnline, setIsOnline] = useState(navigator.onLine);

    useEffect(() => {
        const handleOnline = () => {
            setIsOnline(true);
            // Dispatch a custom event that other parts of the app can listen for
            window.dispatchEvent(new CustomEvent('app:online'));
        };
        
        const handleOffline = () => {
            setIsOnline(false);
            // Dispatch a custom event that other parts of the app can listen for
            window.dispatchEvent(new CustomEvent('app:offline'));
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        
        // Check initial status on mount
        if (!navigator.onLine) {
            handleOffline();
        }

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    return (
        <OnlineStatusContext.Provider value={isOnline}>
            {children}
        </OnlineStatusContext.Provider>
    );
}

export function useOnlineStatus() {
    const context = useContext(OnlineStatusContext);
    if (context === undefined) {
        throw new Error('useOnlineStatus must be used within an OnlineStatusProvider');
    }
    return context;
}