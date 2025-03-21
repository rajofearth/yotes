import React from 'react';
import { Badge } from '../../components/ui/badge';
import { X } from 'lucide-react';

export const TagList = ({ tagIds, tags, onRemoveTag }) => {
  return (
    <div className="flex flex-wrap gap-1">
      {tagIds?.length > 0 ? (
        tagIds.map(tagId => {
          const tag = tags.find(t => t.id === tagId);
          return tag ? (
            <span
              key={tagId}
              className={`inline-flex items-center px-1 py-0.5 rounded text-xs ${tag.color || 'bg-gray-500/20 text-gray-500'} cursor-pointer`}
              onClick={() => onRemoveTag && onRemoveTag(tagId)}
            >
              {tag.name}
              {onRemoveTag && (
                <button
                  className="ml-0.5 hover:text-red-500 rounded-full hover:bg-white/10 transition-colors flex items-center justify-center h-3 w-3"
                  aria-label={`Remove tag ${tag.name}`}
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              )}
            </span>
          ) : null;
        })
      ) : (
        <div className="text-text-primary/60 text-xs py-0.5">No tags</div>
      )}
    </div>
  );
};