import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { FileText } from 'lucide-react';

export const DeleteTagDialog = ({ open, onOpenChange, loading, handleTagAction, tagId, tagUsageCount = 0 }) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="bg-bg-primary border-overlay/10 shadow-lg">
      <DialogHeader>
        <DialogTitle className="text-xl font-semibold text-text-primary">Confirm Tag Deletion</DialogTitle>
        <DialogDescription className="text-text-primary/60">
          {tagUsageCount > 0 ? (
            <>
              <p>This tag is used in {tagUsageCount} {tagUsageCount === 1 ? 'note' : 'notes'}.</p>
              <div className="flex items-center gap-1 mt-2 text-yellow-500">
                <FileText className="h-4 w-4" />
                <span>The tag will be removed from all notes.</span>
              </div>
            </>
          ) : (
            <p>This tag is not used in any notes and will be permanently deleted.</p>
          )}
        </DialogDescription>
      </DialogHeader>
      <DialogFooter className="flex flex-col sm:flex-row justify-end gap-4">
        <Button variant="outline" onClick={() => onOpenChange(false)} className="bg-overlay/5 hover:bg-overlay/10">
          Cancel
        </Button>
        <Button
          variant="destructive"
          onClick={() => handleTagAction('delete', tagId)}
          disabled={loading.tagDelete}
          className="bg-red-500 text-white hover:text-white"
        >
          {loading.tagDelete ? 'Deleting...' : 'Delete'}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);