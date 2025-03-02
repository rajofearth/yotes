// src/components/settings/TagManagementCard.jsx
import { useRef, useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Plus, Trash2, Pencil } from 'lucide-react';
import { EditTagDialog } from './EditTagDialog';

export const TagManagementCard = ({
  tags,
  tagState,
  setTagState,
  setDialogs,
  handleTagAction,
}) => {
  const scrollContainerRef = useRef(null);
  const [gradients, setGradients] = useState({ top: false, bottom: false });

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (container) {
      const updateGradients = () => {
        const { scrollTop, clientHeight, scrollHeight } = container;
        setGradients({
          top: scrollTop > 0,
          bottom: scrollTop + clientHeight < scrollHeight,
        });
      };
      updateGradients();
      container.addEventListener('scroll', updateGradients);
      return () => container.removeEventListener('scroll', updateGradients);
    }
  }, [tags]);

  const maxVisibleTags = 4;
  const tagHeight = 38;
  const maxHeight = `${maxVisibleTags * tagHeight}px`;

  return (
    <Card className="bg-overlay/5 border-overlay/10">
      <CardHeader className="grid grid-cols-[1fr_auto] items-center gap-4">
        <div className="flex flex-col">
          <CardTitle>Tag Management</CardTitle>
          <p className="text-sm text-muted-foreground">{tags?.length || 0} Tags</p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 rounded-full bg-overlay/5 hover:bg-overlay/10 transition-colors"
          onClick={() => setDialogs(prev => ({ ...prev, createTag: true }))}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {tags.length ? (
          <div className="relative">
            <ul
              ref={scrollContainerRef}
              className="space-y-2 overflow-y-auto pr-2 pl-2 scrollbar-hide rounded"
              style={{ maxHeight }}
            >
              {tags.map(tag => (
                <li
                  key={tag.id}
                  className="flex items-center gap-2 bg-overlay/10 rounded pl-2 py-1 transition-colors hover:bg-overlay/20"
                >
                  <div className="flex items-center gap-2 flex-1">
                    <span className={tag.color?.split(' ').find(c => c.startsWith('text-')) || 'text-gray-500'}>
                      <div className="w-3 h-3 rounded-full bg-current"></div>
                    </span>
                    <span className="text-sm text-text-primary/80 truncate">{tag.name}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() =>
                      setTagState(prev => ({
                        ...prev,
                        editingId: tag.id,
                        editingName: tag.name,
                        editingColor: tag.color
                      }))
                    }
                    className="h-8 w-8 hover:bg-overlay/10"
                  >
                    <Pencil className="h-4 w-4 text-icon-primary hover:text-text-primary transition-colors" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setTagState(prev => ({ ...prev, tagToDelete: tag.id }));
                      setDialogs(prev => ({ ...prev, deleteTag: true }));
                    }}
                    className="h-8 w-8 hover:bg-overlay/10"
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </li>
              ))}
            </ul>
            {gradients.top && (
              <div className="absolute top-0 left-0 right-0 h-12 bg-gradient-to-b from-bg-primary via-bg-primary/80 to-transparent pointer-events-none rounded" />
            )}
            {gradients.bottom && (
              <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-bg-primary via-bg-primary/80 to-transparent pointer-events-none rounded" />
            )}
          </div>
        ) : (
          <p className="text-sm text-text-primary/60">No tags created yet.</p>
        )}
      </CardContent>
      <EditTagDialog
        open={!!tagState.editingId}
        onOpenChange={(open) => !open && setTagState(prev => ({ ...prev, editingId: null }))}
        tagState={tagState}
        setTagState={setTagState}
        handleTagAction={handleTagAction}
        tag={tags.find(t => t.id === tagState.editingId) || {}}
      />
    </Card>
  );
};