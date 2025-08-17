import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Brain, RefreshCw, X, ChevronDown, ChevronUp, Tag, Sparkles, Lightbulb, List } from 'lucide-react';
import { Skeleton } from '../ui/skeleton';
import { Badge } from '../ui/badge';
import { generateSearchSummary } from '../../utils/aiSummaryService';
import { useNotes } from '../../contexts/NotesContext';
import { useToast } from '../../contexts/ToastContext';

export const AISummaryCard = ({ 
  notes, 
  searchQuery, 
  aiSettings,
  onCreateTag
}) => {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState(true);
  const showToast = useToast();

  // Get current user's Convex ID for AI requests
  const { convexUserId } = useNotes();

  // Prevent duplicate fetches (StrictMode and re-renders)
  const inFlightKeyRef = useRef(null);
  const completedKeyRef = useRef(null);

  const requestKey = useMemo(() => {
    const sortedIds = (notes || []).map(n => n.id).sort().join(',');
    return `${searchQuery || ''}|${sortedIds}|${convexUserId || ''}`;
  }, [notes, searchQuery, convexUserId]);

  const fetchSummary = useCallback(async (key) => {
    setLoading(true);
    setError(null);
    try {
      const summaryData = await generateSearchSummary(notes, searchQuery, convexUserId);
      setSummary(summaryData);
    } catch (err) {
      console.error('Failed to generate summary:', err);
      setError(err.message || 'Failed to generate summary');
      showToast('Failed to generate AI summary', 'error');
    } finally {
      inFlightKeyRef.current = null;
      completedKeyRef.current = key;
      setLoading(false);
    }
  }, [notes, searchQuery, convexUserId, showToast]);

  const handleCreateTag = (tagName) => {
    if (onCreateTag && tagName) {
      onCreateTag(tagName);
    }
  };

  const handleRefresh = () => {
    setSummary(null);
    // Allow a fresh request regardless of previous completion
    completedKeyRef.current = null;
    if (aiSettings?.enabled && searchQuery && notes.length > 0) {
      const key = requestKey;
      inFlightKeyRef.current = key;
      fetchSummary(key);
    }
  };

  // Debounce AI summary until user stops typing for a bit
  useEffect(() => {
    if (!aiSettings?.enabled || !searchQuery || notes.length === 0) return;
    const key = requestKey;
    if (inFlightKeyRef.current === key || completedKeyRef.current === key) return;
    const TYPING_DELAY_MS = 800;
    const timer = setTimeout(() => {
      if (inFlightKeyRef.current === key || completedKeyRef.current === key) return;
      inFlightKeyRef.current = key;
      fetchSummary(key);
    }, TYPING_DELAY_MS);
    return () => clearTimeout(timer);
  }, [aiSettings?.enabled, searchQuery, notes, requestKey, fetchSummary]);

  // If no search query or no search results, don't show the card
  if (!searchQuery || notes.length === 0) {
    return null;
  }

  return (
    <Card className="mb-4 bg-overlay/5 border-overlay/10 overflow-hidden">
      <CardHeader className="py-3 px-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="h-4 w-4 text-primary" />
            <span>AI Summary</span>
            {loading && <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />}
          </div>
          <div className="flex items-center gap-4">
            <Button 
              variant="outline" 
              size="icon" 
              className="h-7 w-7"
              onClick={handleRefresh}
              disabled={loading}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button 
              variant="outline" 
              size="icon" 
              className="h-7 w-7"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </CardHeader>
      
      {expanded && (
        <CardContent className="p-4 space-y-4">
          {loading && (
            <div className="space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-[80%]" />
              <div className="pt-2">
                <Skeleton className="h-3 w-[90%] mb-2" />
                <Skeleton className="h-3 w-[85%] mb-2" />
                <Skeleton className="h-3 w-[70%]" />
              </div>
            </div>
          )}
          
          {error && (
            <div className="text-sm text-red-500 p-2 bg-red-50 dark:bg-red-900/20 rounded-md">
              <p>Error generating summary: {error}</p>
            </div>
          )}
          
          {summary && !loading && (
            <div className="space-y-2">
              <div>
                <p className="text-sm text-muted-foreground">{summary.overview}</p>
              </div>
              
              {summary.themes && summary.themes.length > 0 && (
                <div className="space-y-1.5">
                  <h3 className="text-xs font-medium flex items-center gap-1.5">
                    <List className="h-3.5 w-3.5 text-primary" />
                    <span>Common Themes</span>
                  </h3>
                  <ul className="text-xs space-y-1 pl-5 list-disc">
                    {summary.themes.map((theme, i) => (
                      <li key={i}>{theme}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              {summary.takeaways && summary.takeaways.length > 0 && (
                <div className="space-y-1.5">
                  <h3 className="text-xs font-medium flex items-center gap-1.5">
                    <Lightbulb className="h-3.5 w-3.5 text-amber-500" />
                    <span>Key Takeaways</span>
                  </h3>
                  <ul className="text-xs space-y-1 pl-5 list-disc">
                    {summary.takeaways.map((takeaway, i) => (
                      <li key={i}>{takeaway}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              {summary.suggestedTags && summary.suggestedTags.length > 0 && (
                <div className="space-y-1.5">
                  <h3 className="text-xs font-medium flex items-center gap-1.5">
                    <Tag className="h-3.5 w-3.5 text-blue-500" />
                    <span>Suggested Tags</span>
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {summary.suggestedTags.map((tag, i) => (
                      <Badge 
                        key={i}
                        variant="outline"
                        className="cursor-pointer hover:bg-background/80 text-xs py-0"
                        onClick={() => handleCreateTag(tag)}
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="text-[10px] text-text-primary/60 pt-1 flex items-center justify-end">
                <div className="flex items-center gap-1">
                  <Brain className="h-3 w-3" />
                  <span>Generated by Google Gemini</span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}; 