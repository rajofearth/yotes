import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { LogOut, AlertTriangle, DownloadCloud, Shield } from 'lucide-react';

export const AccountActionsCard = ({ loading, handleLogout, handleDeleteAccount, setDialogs }) => (
  <Card className="bg-overlay/5 border-overlay/10">
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <Shield className="h-5 w-5 text-primary" />
        Account Security
      </CardTitle>
    </CardHeader>
    <CardContent className="space-y-6">
      <div className="space-y-2">
        <h3 className="text-sm font-medium">Data Export</h3>
        <p className="text-xs text-text-primary/60">Download all your notes and personal data.</p>
        <Button 
          variant="outline" 
          className="mt-2 w-full sm:w-auto flex items-center gap-2 bg-overlay/5"
          disabled={loading?.logout || loading?.delete}
        >
          <DownloadCloud className="h-4 w-4" />
          Export Data
        </Button>
      </div>
      
      <div className="space-y-2">
        <h3 className="text-sm font-medium">Logout</h3>
        <p className="text-xs text-text-primary/60">Sign out from your current session.</p>
        <Button 
          variant="outline" 
          className="mt-2 w-full sm:w-auto flex items-center gap-2 bg-overlay/5"
          onClick={handleLogout}
          disabled={loading?.logout || loading?.delete}
        >
          <LogOut className="h-4 w-4" />
          Logout
        </Button>
      </div>
      
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-red-500">Danger Zone</h3>
        <p className="text-xs text-text-primary/60">These actions are permanent and cannot be undone.</p>
        <Button 
          variant="destructive" 
          className="mt-2 w-full sm:w-auto flex items-center gap-2"
          onClick={() => setDialogs(prev => ({ ...prev, deleteAccount: true }))}
          disabled={loading?.logout || loading?.delete}
        >
          <AlertTriangle className="h-4 w-4" />
          Delete Account
        </Button>
      </div>
    </CardContent>
  </Card>
);