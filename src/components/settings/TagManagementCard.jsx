// src/components/settings/TagManagementCard.jsx
import { useRef, useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Plus, Trash2, Pencil, Tag as TagIcon, Search } from 'lucide-react';
import { Input } from '../ui/input';
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
  const [searchQuery, setSearchQuery] = useState('');

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

  // Filter tags based on search query
  const filteredTags = tags.filter(tag => 
    tag.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Adjust visible tags based on screen size
  const maxVisibleTags = 6;
  const tagHeight = 54;
  const maxHeight = `${maxVisibleTags * tagHeight}px`;

  return (
    <Card className="bg-overlay/5 border-overlay/10 h-full">
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-2">
          <CardTitle className="flex items-center gap-2">
            <TagIcon className="h-5 w-5 text-primary" />
            Tag Management
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            className="rounded-full bg-overlay/5 hover:bg-overlay/10 transition-colors flex items-center gap-2"
            onClick={() => setDialogs(prev => ({ ...prev, createTag: true }))}
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Add Tag</span>
          </Button>
        </div>
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-primary/50" />
          <Input
            type="text"
            placeholder="Search tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 bg-overlay/5 border-overlay/10 focus:border-primary/50"
          />
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex justify-between items-center mb-4">
          <p className="text-sm text-text-primary/70">
            {filteredTags.length} of {tags.length} tags
          </p>
        </div>
        {tags.length ? (
          <div className="relative">
            <ul
              ref={scrollContainerRef}
              className="space-y-3 overflow-y-auto pr-2 pl-1 scrollbar-hide rounded"
              style={{ maxHeight }}
            >
              {filteredTags.map(tag => (
                <li
                  key={tag.id}
                  className="flex items-center gap-3 bg-overlay/10 rounded-lg p-3 transition-colors hover:bg-overlay/20"
                >
                  <div className="flex items-center gap-3 flex-1 truncate">
                    <div className={`w-4 h-4 rounded-full ${tag.color?.split(' ').find(c => c.startsWith('text-')) || 'text-gray-500'} bg-current flex-shrink-0`}></div>
                    <span className="text-sm font-medium text-text-primary/90 truncate">{tag.name}</span>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
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
                      className="h-8 w-8 rounded-full hover:bg-overlay/20"
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
                      className="h-8 w-8 rounded-full hover:bg-overlay/20"
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
            {gradients.top && (
              <div className="absolute top-0 left-0 right-0 h-12 bg-gradient-to-b from-bg-primary via-bg-primary/80 to-transparent pointer-events-none rounded-t-lg" />
            )}
            {gradients.bottom && (
              <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-bg-primary via-bg-primary/80 to-transparent pointer-events-none rounded-b-lg" />
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-10 bg-overlay/5 rounded-lg">
            <TagIcon className="h-12 w-12 text-text-primary/30 mb-4" />
            <p className="text-sm text-text-primary/60 mb-2">No tags created yet</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() => setDialogs(prev => ({ ...prev, createTag: true }))}
            >
              <Plus className="h-4 w-4 mr-2" />
              Create your first tag
            </Button>
          </div>
        )}
        {filteredTags.length === 0 && tags.length > 0 && (
          <div className="flex flex-col items-center justify-center py-8 bg-overlay/5 rounded-lg">
            <p className="text-sm text-text-primary/60">No tags matching your search</p>
            <Button
              variant="link"
              size="sm"
              className="mt-2"
              onClick={() => setSearchQuery('')}
            >
              Clear search
            </Button>
          </div>
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