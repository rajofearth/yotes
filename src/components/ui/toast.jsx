import { useState, useEffect } from 'react';
import { X, CheckCircle, AlertCircle } from 'lucide-react';
import { cn } from '../../lib/utils';

export function Toast({ message, type = 'success', onClose }) {
    const [isVisible, setIsVisible] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsVisible(false);
            setTimeout(onClose, 300); // Allow time for exit animation
        }, 5000);

        return () => clearTimeout(timer);
    }, [onClose]);

    return (
        <div
            className={cn(
                "fixed bottom-4 right-4 flex items-center gap-2 rounded-lg border border-overlay/10 bg-bg-primary/95 px-4 py-3 shadow-lg backdrop-blur transition-all duration-300",
                isVisible ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
            )}
        >
            {type === 'success' ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
            ) : (
                <AlertCircle className="h-5 w-5 text-red-500" />
            )}
            <p className="text-sm text-text-primary">{message}</p>
            <button
                onClick={() => {
                    setIsVisible(false);
                    setTimeout(onClose, 300);
                }}
                className="ml-2 text-icon-primary hover:text-text-primary"
            >
                <X className="h-4 w-4" />
            </button>
        </div>
    );
} 