import { useRef, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Pencil, User, Mail, Calendar, Image as ImageIcon, Trash2 } from 'lucide-react';
import { useAction, useMutation, useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { useNotes } from '../../hooks/useNotes';

export const AccountDetailsCard = ({ user }) => {
  const fileInputRef = useRef(null);
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [error, setError] = useState(null);
  const generateUrl = useAction(api.users.generateAvatarUploadUrl);
  const setAvatar = useMutation(api.users.setAvatar);
  const { convexUserId } = useNotes();
  const currentAvatar = useQuery(api.users.getAvatarUrl, user?.id ? { externalId: user.id } : 'skip');

  const onChooseFile = () => fileInputRef.current?.click();

  const onFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    if (!file.type.startsWith('image/')) { setError('Please select an image file.'); return; }
    if (file.size > 5 * 1024 * 1024) { setError('Max file size is 5MB.'); return; }
    try {
      setIsUploading(true);
      // Optimistic local preview
      try { setPreviewUrl(URL.createObjectURL(file)); } catch {}
      const { url } = await generateUrl({});
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': file.type || 'application/octet-stream' },
        body: file,
      });
      if (!res.ok) throw new Error('Upload failed');
      const { storageId } = await res.json();
      if (!convexUserId) throw new Error('Missing Convex user id');
      await setAvatar({ userId: convexUserId, storageId });
      // Clear the input value to allow re-uploading same file later
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      setError(err?.message || 'Failed to upload');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Card className="bg-overlay/5 border-overlay/10 h-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full overflow-hidden bg-overlay/10">
            {previewUrl || currentAvatar?.url ? (
              <img
                key={previewUrl || currentAvatar?.url}
                src={previewUrl || currentAvatar?.url}
                alt="Profile"
                className="h-full w-full object-cover"
                onError={() => setPreviewUrl(null)}
              />
            ) : (
              <div className="h-full w-full flex items-center justify-center text-icon-primary"><User className="h-5 w-5" /></div>
            )}
          </div>
          <CardTitle>Account Details</CardTitle>
        </div>
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={onFileChange}
            className="hidden"
          />
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full"
            onClick={onChooseFile}
            type="button"
            title="Upload profile picture"
            disabled={isUploading}
          >
            {isUploading ? (
              <ImageIcon className="h-4 w-4 animate-pulse" />
            ) : (
              <Pencil className="h-4 w-4" />
            )}
          </Button>
          {currentAvatar?.url ? (
            <ClearAvatarButton convexUserId={convexUserId} />
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {error ? <p className="text-xs text-red-400">{error}</p> : null}
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-overlay/10">
              <Mail className="h-4 w-4 text-text-primary/70" />
            </div>
            <div className="space-y-0.5">
              <p className="text-xs text-text-primary/60">Email</p>
              <p className="text-sm font-medium">{user?.email || 'Loading...'}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-overlay/10">
              <User className="h-4 w-4 text-text-primary/70" />
            </div>
            <div className="space-y-0.5">
              <p className="text-xs text-text-primary/60">Name</p>
              <p className="text-sm font-medium">{user?.user_metadata?.name || 'Not set'}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-overlay/10">
              <Calendar className="h-4 w-4 text-text-primary/70" />
            </div>
            <div className="space-y-0.5">
              <p className="text-xs text-text-primary/60">Joined</p>
              <p className="text-sm font-medium">{user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'Loading...'}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const ClearAvatarButton = ({ convexUserId }) => {
  const clearAvatar = useMutation(api.users.clearAvatar);
  const [busy, setBusy] = useState(false);
  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-8 w-8 rounded-full"
      onClick={async () => {
        if (!convexUserId) return;
        try { setBusy(true); await clearAvatar({ userId: convexUserId }); } finally { setBusy(false); }
      }}
      title="Remove profile picture"
      disabled={busy}
      type="button"
    >
      <Trash2 className="h-4 w-4" />
    </Button>
  );
};