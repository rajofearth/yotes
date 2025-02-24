import { useRef, useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Edit, Plus, Save, X, Trash2 } from 'lucide-react';

export const TagManagementCard = ({ tags, tagState, setTagState, setDialogs, handleTagAction }) => {
  const inputRef = useRef(null);
  const cardRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const [gradients, setGradients] = useState({ top: false, bottom: false });

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (tagState.editingId && cardRef.current && !cardRef.current.contains(event.target)) {
        setTagState(prev => ({ ...prev, editingId: null, editingName: '' }));
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [tagState.editingId, setTagState]);

  useEffect(() => {
    if (tagState.editingId && inputRef.current) {
      inputRef.current.focus();
    }
  }, [tagState.editingId]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (container) {
      const updateGradients = () => {
        const { scrollTop, clientHeight, scrollHeight } = container;
        setGradients({
          top: scrollTop > 0,
          bottom: scrollTop + clientHeight < scrollHeight
        });
      };
      updateGradients();
      container.addEventListener('scroll', updateGradients);
      return () => container.removeEventListener('scroll', updateGradients);
    }
  }, [tags]);

  const cancelEdit = () => {
    setTagState(prev => ({ ...prev, editingId: null, editingName: '' }));
  };

  const handleSave = (tagId) => {
    if (tagState.editingName.trim()) {
      handleTagAction('update', { id: tagId, name: tagState.editingName });
    } else {
      cancelEdit();
    }
  };

  const handleKeyDown = (e, tagId) => {
    if (e.key === 'Enter') handleSave(tagId);
    if (e.key === 'Escape') cancelEdit();
  };

  const maxVisibleTags = 4;
  const tagHeight = 38;
  const maxHeight = `${maxVisibleTags * tagHeight}px`;

  return (
    <Card ref={cardRef} className="bg-overlay/5 border-overlay/10">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Tag Management</CardTitle>
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
              className="space-y-2 overflow-y-auto pr-2"
              style={{ maxHeight }}
            >
              {tags.map(tag => (
                <li
                  key={tag.id}
                  className="flex items-center gap-2 bg-overlay/10 rounded pl-2 py-1 transition-colors hover:bg-overlay/20"
                >
                  {tagState.editingId === tag.id ? (
                    <>
                      <Input
                        ref={inputRef}
                        value={tagState.editingName}
                        onChange={e => setTagState(prev => ({ ...prev, editingName: e.target.value }))}
                        onKeyDown={e => handleKeyDown(e, tag.id)}
                        className="flex-1 bg-overlay/5 border-overlay/10 h-8 text-sm"
                        placeholder="Enter tag name"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleSave(tag.id)}
                        className="h-8 w-8 hover:bg-overlay/10"
                      >
                        <Save className="h-4 w-4 text-green-500" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={cancelEdit}
                        className="h-8 w-8 hover:bg-overlay/10"
                      >
                        <X className="h-4 w-4 text-gray-500" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <span className="flex-1 text-sm text-text-primary/80 truncate">{tag.name}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setTagState(prev => ({ ...prev, editingId: tag.id, editingName: tag.name }))}
                        className="h-8 w-8 hover:bg-overlay/10"
                      >
                        <Edit className="h-4 w-4" />
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
                    </>
                  )}
                </li>
              ))}
            </ul>
            {gradients.top && (
              <div className="absolute top-0 left-0 right-0 h-12 bg-gradient-to-b from-bg-primary via-bg-primary/80 to-transparent pointer-events-none" />
            )}
            {gradients.bottom && (
              <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-bg-primary via-bg-primary/80 to-transparent pointer-events-none" />
            )}
          </div>
        ) : (
          <p className="text-sm text-text-primary/60">No tags created yet.</p>
        )}
      </CardContent>
    </Card>
  );
};