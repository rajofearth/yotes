import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Plus, Settings, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function NavBar({ onSearch }) {
    const navigate = useNavigate();

    return (
        <nav className="sticky top-0 z-50 border-b border-overlay/10 bg-bg-primary/95 backdrop-blur">
            <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex h-16 items-center justify-between gap-4">
                    <h1 className="text-xl sm:text-2xl font-semibold tracking-tight truncate">Yotes</h1>
                    <div className="flex-1 lg:flex-none">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-icon-primary" />
                            <Input
                                type="text"
                                placeholder="Search notes..."
                                className="w-full lg:w-[300px] pl-9 h-10 bg-overlay/5 border-overlay/10 rounded-full text-sm"
                                onChange={(e) => onSearch(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-4">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-10 w-10 rounded-full bg-overlay/5 hover:bg-overlay/10"
                            onClick={() => navigate('/create')}
                        >
                            <Plus className="h-5 w-5 text-icon-primary" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-10 w-10 rounded-full bg-overlay/5 hover:bg-overlay/10"
                            onClick={() => navigate('/settings')}
                        >
                            <Settings className="h-5 w-5 text-icon-primary" />
                        </Button>
                    </div>
                </div>
            </div>
        </nav>
    );
}