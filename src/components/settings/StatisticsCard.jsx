import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { FileText, Tag, Clock, BarChart3 } from 'lucide-react';

export const StatisticsCard = ({ notes, tags }) => {
  const totalNotes = notes?.length || 0;
  const totalTags = tags?.length || 0;
  
  // Calculate the total word count across all notes
  const totalWords = notes?.reduce((acc, note) => {
    const wordCount = note.content?.split(/\s+/).filter(Boolean).length || 0;
    return acc + wordCount;
  }, 0) || 0;
  
  // Get the last edit date
  const lastEditDate = notes?.length 
    ? new Date(Math.max(...notes.map(note => new Date(note.updated_at || note.created_at))))
    : null;
    
  return (
    <Card className="bg-overlay/5 border-overlay/10 h-full min-h-[400px]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          Usage Statistics
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-overlay/10">
              <FileText className="h-6 w-6 text-text-primary/70" />
            </div>
            <div>
              <p className="text-sm text-text-primary/60">Total Notes</p>
              <p className="text-2xl font-semibold">{totalNotes}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-overlay/10">
              <Tag className="h-6 w-6 text-text-primary/70" />
            </div>
            <div>
              <p className="text-sm text-text-primary/60">Total Tags</p>
              <p className="text-2xl font-semibold">{totalTags}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-overlay/10">
              <FileText className="h-6 w-6 text-text-primary/70" />
            </div>
            <div>
              <p className="text-sm text-text-primary/60">Total Words</p>
              <p className="text-2xl font-semibold">{totalWords.toLocaleString()}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-overlay/10">
              <Clock className="h-6 w-6 text-text-primary/70" />
            </div>
            <div>
              <p className="text-sm text-text-primary/60">Last Edit</p>
              <p className="text-2xl font-semibold">
                {lastEditDate ? lastEditDate.toLocaleDateString() : 'N/A'}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};