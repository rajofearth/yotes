import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';

export const StatisticsCard = ({ notes, tags }) => (
  <Card className="bg-overlay/5 border-overlay/10">
    <CardHeader>
      <CardTitle>Statistics</CardTitle>
    </CardHeader>
    <CardContent className="space-y-2">
      <p className="text-sm text-text-primary/80">Total Notes: <span className="font-medium">{notes.length}</span></p>
      <p className="text-sm text-text-primary/80">Total Tags: <span className="font-medium">{tags.length}</span></p>
      <p className="text-sm text-text-primary/60 italic">Storage usage not implemented.</p>
    </CardContent>
  </Card>
);