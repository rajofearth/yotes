import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Pencil, User, Mail, Calendar } from 'lucide-react';

export const AccountDetailsCard = ({ user }) => (
  <Card className="bg-overlay/5 border-overlay/10 h-full">
    <CardHeader className="flex flex-row items-center justify-between">
      <CardTitle>Account Details</CardTitle>
      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
        <Pencil className="h-4 w-4" />
      </Button>
    </CardHeader>
    <CardContent className="space-y-4">
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