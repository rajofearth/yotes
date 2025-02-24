import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';

export const AccountDetailsCard = ({ user }) => (
  <Card className="bg-overlay/5 border-overlay/10">
    <CardHeader>
      <CardTitle>Account Details</CardTitle>
    </CardHeader>
    <CardContent className="space-y-2 overflow-x-hidden">
      <p className="text-sm text-text-primary/80">Email: <span className="font-medium">{user?.email || 'Loading...'}</span></p>
      <p className="text-sm text-text-primary/80">Name: <span className="font-medium">{user?.user_metadata?.name || 'Not set'}</span></p>
      <p className="text-sm text-text-primary/80">Joined: <span className="font-medium">{user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'Loading...'}</span></p>
    </CardContent>
  </Card>
);