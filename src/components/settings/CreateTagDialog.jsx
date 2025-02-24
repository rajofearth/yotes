import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';

export const CreateTagDialog = ({ open, onOpenChange, tagState, setTagState, handleTagAction }) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="bg-bg-primary border-overlay/10 shadow-lg">
      <DialogHeader>
        <DialogTitle className="text-xl font-semibold text-text-primary">Create New Tag</DialogTitle>
        <DialogDescription className="text-text-primary/60">Enter a name for your new tag.</DialogDescription>
      </DialogHeader>
      <div className="py-4">
        <Input
          type="text"
          placeholder="Tag name"
          value={tagState.newName}
          onChange={e => setTagState(prev => ({ ...prev, newName: e.target.value }))}
          className="w-full bg-overlay/5 border-overlay/10"
        />
      </div>
      <DialogFooter className="flex flex-col sm:flex-row justify-end gap-4">
        <Button
          onClick={() => handleTagAction('create', tagState.newName)}
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