import React from 'react';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../contexts/OnlineStatusContext';

export function OfflineBadge() {
    const isOnline = useOnlineStatus();

    if (isOnline) {
        return null;
    }

    return (
        <div className="fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-full border border-yellow-500/30 bg-yellow-900/80 px-3 py-1.5 text-xs text-yellow-300 shadow-lg backdrop-blur">
            <WifiOff className="h-4 w-4" />
            <span>Offline Mode</span>
        </div>
    );
}