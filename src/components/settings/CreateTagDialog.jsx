// src/components/settings/CreateTagDialog.jsx
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { ColorSelect, colorOptions } from './ColorSelect';

export const CreateTagDialog = ({ open, onOpenChange, tagState, setTagState, handleTagAction }) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-bg-primary border-overlay/10 shadow-lg">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-text-primary">Create New Tag</DialogTitle>
          <DialogDescription className="text-text-primary/60">Enter a name and pick a color for your new tag.</DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <Input
            type="text"
            placeholder="Tag name"
            value={tagState.newName}
            onChange={e => setTagState(prev => ({ ...prev, newName: e.target.value }))}
            className="w-full bg-overlay/5 border-overlay/10"
          />
          <ColorSelect
            value={tagState.newColor}
            onValueChange={(value) => setTagState((prev) => ({ ...prev, newColor: value }))}
          />
          <div className="flex items-center gap-2">
            <span className="text-sm text-text-primary/60">Preview:</span>
            <span
              className={`inline-flex items-center px-2 py-1 rounded ${tagState.newColor || colorOptions[0].value}`}
            >
              {tagState.newName || 'Sample'}
            </span>
          </div>
        </div>
        <DialogFooter className="flex flex-col sm:flex-row justify-end gap-4">
          <Button
            onClick={() => handleTagAction('create', { name: tagState.newName, color: tagState.newColor })}
            disabled={!tagState.newName.trim()}
            className="bg-overlay/10 hover:bg-overlay/20"
          >
            Create Tag
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="bg-overlay/5 hover:bg-overlay/10">
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};