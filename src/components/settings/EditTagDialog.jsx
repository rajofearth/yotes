// src/components/settings/EditTagDialog.jsx
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { ColorSelect, colorOptions } from './ColorSelect';
import { FileText } from 'lucide-react';

export const EditTagDialog = ({ open, onOpenChange, tagState, setTagState, handleTagAction, tag, tagUsageCount = 0 }) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-bg-primary border-overlay/10 shadow-lg">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-text-primary">Edit Tag</DialogTitle>
          <DialogDescription className="text-text-primary/60">
            Update the name and color of your tag.
            {tagUsageCount > 0 && (
              <div className="flex items-center gap-1 mt-2 text-text-primary/70">
                <FileText className="h-4 w-4" />
                <span>Used in {tagUsageCount} {tagUsageCount === 1 ? 'note' : 'notes'}</span>
              </div>
            )}
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <Input
            type="text"
            placeholder="Tag name"
            value={tagState.editingName}
            onChange={e => setTagState(prev => ({ ...prev, editingName: e.target.value }))}
            className="w-full bg-overlay/5 border-overlay/10"
          />
          <ColorSelect
            value={tagState.editingColor || tag.color}
            onValueChange={value => setTagState(prev => ({ ...prev, editingColor: value }))}
          />
          <div className="flex items-center gap-2">
            <span className="text-sm text-text-primary/60">Preview:</span>
            <span
              className={`inline-flex items-center px-2 py-1 rounded ${tagState.editingColor || tag.color || colorOptions[0].value}`}
            >
              {tagState.editingName || tag.name || 'Sample'}
            </span>
          </div>
        </div>
        <DialogFooter className="flex flex-col sm:flex-row justify-end gap-4">
          <Button
            onClick={() => handleTagAction('update', { id: tag.id, name: tagState.editingName, color: tagState.editingColor })}
            disabled={!tagState.editingName.trim()}
            className="bg-overlay/10 hover:bg-overlay/20"
          >
            Save Changes
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="bg-overlay/5 hover:bg-overlay/10">
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};