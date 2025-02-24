import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { LogOut, Trash2 } from 'lucide-react';

export const AccountActionsCard = ({ loading, handleLogout, setDialogs }) => (
  <Card className="bg-overlay/5 border-overlay/10">
    <CardHeader>
      <CardTitle>Account Actions</CardTitle>
    </CardHeader>
    <CardContent className="space-y-4">
      <p className="text-sm text-text-primary/80">Manage your account settings below.</p>
      <Button
        variant="outline"
        onClick={handleLogout}
        disabled={loading.logout || loading.delete}
        className="w-full flex items-center justify-center gap-2 bg-overlay/5 hover:bg-overlay/10"
      >
        <LogOut className="h-4 w-4" />
        {loading.logout ? 'Logging out...' : 'Logout'}
      </Button>
      <Button
        variant="destructive"
        onClick={() => setDialogs(prev => ({ ...prev, deleteAccount: true }))}
        disabled={loading.logout || loading.delete}
        className="w-full flex items-center justify-center gap-2 bg-red-500 text-white hover:text-white"
      >
        <Trash2 className="h-4 w-4" />
        {loading.delete ? 'Processing...' : 'Delete Account'}
      </Button>
    </CardContent>
  </Card>
);