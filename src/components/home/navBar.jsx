import { useState, useEffect } from 'react';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Plus, Search, FileText, LogOut, Upload, Settings, User as UserIcon, ImageIcon, Lock, Unlock } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator
} from "../ui/dropdown-menu";
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../utils/supabaseClient';
import { getFromDB, setInDB, openDB } from '../../utils/indexedDB';
import { useOnlineStatus } from '../../contexts/OnlineStatusContext';
import { useSettings } from '../../hooks/useSettings';
import { useAISettings } from '../../hooks/useAISettings'; 
import { ImageUploadModal } from '../image/ImageUploadModal';
import { useToast } from '../../contexts/ToastContext';
import { TextShimmer } from '../ui/text-shimmer';
import { Badge } from '../ui/badge';
import { useNotes } from '../../hooks/useNotes';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';

export default function NavBar({ onSearch }) {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true); // This is for user session loading
  const isOnline = useOnlineStatus();
  const { handleLogout } = useSettings();
  const { aiSettings, loading: isLoadingAISettings } = useAISettings();
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const showToast = useToast();
  const { isE2EEReady, lockNotes } = useNotes();
  const externalId = user?.id;
  const convexAvatar = useQuery(api.users.getAvatarUrl, externalId ? { externalId } : 'skip');
  const [avatarError, setAvatarError] = useState(false);

  useEffect(() => {
    // Reset error when a new URL arrives
    setAvatarError(false);
  }, [convexAvatar?.url]);

  useEffect(() => {
    let isMounted = true;
    const fetchUser = async () => {
      if (!isMounted) return;
      try {
        setIsLoading(true);
        await openDB();
        let sessionUser = null;
        let cachedSession = null;

        cachedSession = await getFromDB('sessions', 'session');
        if (cachedSession?.user) {
          sessionUser = cachedSession.user;
          if (isMounted) setUser(sessionUser);
        }

        if (isOnline) {
          const { data, error } = await supabase.auth.getUser();
          if (error) {
             console.error('NavBar: Supabase getUser error:', error);
             if (!sessionUser && isMounted) setUser(null);
          } else if (data.user) {
             if (isMounted) setUser(data.user);
             if (cachedSession && JSON.stringify(data.user) !== JSON.stringify(sessionUser)) {
                await setInDB('sessions', 'session', { ...cachedSession, user: data.user });
             }
          } else {
              if (isMounted) setUser(null);
          }
        } else if (!sessionUser && isMounted) {
           setUser(null);
        }
      } catch (error) {
        console.error('NavBar: Failed to load user data:', error);
        if (isMounted) setUser(null);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    fetchUser();
    return () => { isMounted = false };
  }, [isOnline]);

  const profilePicture = convexAvatar?.url ?? null;

  const handleLockNotes = () => {
    if (lockNotes) {
      lockNotes();
      showToast('Notes locked. Enter passphrase to unlock.', 'info');
    }
  };

  return (
    <>
      <nav className="sticky top-0 z-50 border-b border-overlay/10 bg-bg-primary/95 backdrop-blur">
        <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between gap-4">
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight truncate bg-clip-text text-transparent bg-gradient-to-r from-gray-300 to-gray-400">Yotes</h1>
            <div className="flex-1 lg:flex-none">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-icon-primary" />
                <Input
                  type="text"
                  placeholder="Search notes..."
                  className="w-full lg:w-[300px] pl-9 h-10 bg-overlay/5 border-overlay/10 rounded-full text-sm transition-colors focus:ring-2 focus:ring-overlay/20 hover:ring-2 hover:ring-overlay/20"
                  onChange={(e) => onSearch(e.target.value)}
                />
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-4">
              {/* Lock/Unlock Button */}
              {isE2EEReady && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleLockNotes}
                  className="h-10 w-10 rounded-full bg-overlay/5 hover:bg-overlay/10 transition-colors"
                  title="Lock notes (clear encryption key from memory)"
                >
                  <Lock className="h-5 w-5 text-icon-primary" />
                </Button>
              )}
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    className="h-10 w-10 rounded-full bg-overlay/5 hover:bg-overlay/10 transition-colors group"
                  >
                    <Plus className="h-5 w-5 text-icon-primary group-hover:text-white transition-colors" />
                    <span className="sr-only">Create new</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent 
                  align="end"
                  className="w-fit sm:w-48 bg-bg-primary border border-overlay/10 shadow-lg"
                >
                  <DropdownMenuItem 
                    className="flex items-center gap-2 text-text-primary hover:bg-overlay/10 cursor-pointer" 
                    onClick={() => navigate('/create')}
                  >
                    <FileText className="h-4 w-4" />
                    <div className="flex flex-col">
                      <span className="text-sm">Note</span>
                      <span className="text-xs text-text-primary/60">Create a new note</span>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-overlay/10" />
                  <DropdownMenuItem
                    className={`flex items-center gap-2 rounded-sm transition-colors cursor-pointer ${
                      !isLoadingAISettings && aiSettings?.enabled && aiSettings?.apiKey && isOnline
                        ? 'bg-primary/10 hover:bg-primary/20 hover:bg-overlay/10'
                        : 'opacity-50 text-text-primary/40 cursor-not-allowed hover:bg-overlay/10'
                    }`}
                    onClick={() => {
                      if (!isOnline) {
                        showToast('Image note creation is disabled while offline.', 'error');
                        return;
                      }
                      if (isLoadingAISettings) {
                        showToast('AI settings are still loading, please wait.', 'info');
                        return;
                      }
                      if (!aiSettings?.enabled) {
                        showToast('AI features are disabled in settings.', 'error');
                        return;
                      }
                      if (!aiSettings?.apiKey) {
                        showToast('AI API key is not configured in settings.', 'error');
                        return;
                      }
                      setIsImageModalOpen(true);
                    }}
                    title={
                      !isOnline ? "Image note creation is disabled while offline." :
                      isLoadingAISettings ? "AI settings are still loading, please wait." :
                      !aiSettings?.enabled ? "AI features are disabled in settings." :
                      !aiSettings?.apiKey ? "AI API key is not configured in settings." :
                      "Create a new note from an image"
                    }
                    disabled={!isOnline}
                  >
                    <ImageIcon className="h-4 w-4 text-icon-primary" />
                    <div className="flex flex-col">
                      {isLoadingAISettings ? (
                        <TextShimmer className="text-sm font-semibold">Image Note</TextShimmer>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold">Image Note</span>
                          <Badge variant="outline" className="border-primary text-primary hover:bg-primary/20 hover:bg-overlay/10 text-xs">AI</Badge>
                        </div>
                      )}
                      <span className="text-xs text-text-primary/60">Create with image</span>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-overlay/10" />
                  <DropdownMenuItem
                    className="flex items-center gap-2 text-text-primary/40 opacity-50 cursor-not-allowed"
                  >
                    <Upload className="h-4 w-4" />
                    <div className="flex flex-col">
                      <span className="text-sm">Import</span>
                      <span className="text-xs text-text-primary/60">Import from file</span>
                    </div>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full bg-overlay/5 hover:bg-overlay/10 overflow-hidden transition-all hover:ring-2 hover:ring-overlay/20 relative" disabled={isLoading}>
                    {isLoading ? (
                      <div className="h-[80%] w-[80%] rounded-full bg-overlay/10 animate-pulse" />
                    ) : (
                      profilePicture && !avatarError ? (
                        <img
                          src={profilePicture}
                          alt="User profile"
                          className="h-[80%] w-[80%] rounded-full object-cover transition-opacity hover:opacity-90"
                          onError={() => setAvatarError(true)}
                        />
                      ) : (
                        <div className="h-[80%] w-[80%] rounded-full bg-overlay/10 flex items-center justify-center text-icon-primary"><UserIcon className="h-5 w-5"/></div>
                      )
                    )}
                    <span className="sr-only">Avatar</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent 
                  align="end"
                  className="w-fit sm:w-48 bg-bg-primary border border-overlay/10 shadow-lg"
                >
                    <DropdownMenuItem 
                      className="flex items-center gap-2 text-text-primary hover:bg-overlay/10 cursor-pointer" 
                      onClick={() => navigate('/settings')}
                    >
                      <Settings className="h-4 w-4" />
                      <div className="flex flex-col">
                        <span className="text-sm">Settings</span>
                        <span className="text-xs text-text-primary/60">Manage Yotes</span>
                      </div>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-overlay/10" />
                    <DropdownMenuItem 
                      className="flex items-center gap-2 text-text-primary hover:bg-red-300/10 cursor-pointer"
                      onClick={handleLogout}
                    >
                      <LogOut className="h-4 w-4" />
                      <div className="flex flex-col">
                        <span className="text-sm">LogOut</span>
                        <span className="text-xs text-text-primary/60">Leave this session</span>
                      </div>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
      </nav>
      
      <ImageUploadModal 
        isOpen={isImageModalOpen} 
        onClose={() => setIsImageModalOpen(false)} 
      />
    </>
  );
}