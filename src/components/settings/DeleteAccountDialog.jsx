import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';

export const DeleteAccountDialog = ({ open, onOpenChange, loading, handleDeleteAccount }) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="bg-bg-primary border-overlay/10 shadow-lg">
      <DialogHeader>
        <DialogTitle className="text-xl font-semibold text-text-primary">Confirm Account Deletion</DialogTitle>
        <DialogDescription className="text-text-primary/60">Are you sure? This action cannot be undone.</DialogDescription>
      </DialogHeader>
      <DialogFooter className="flex flex-col sm:flex-row justify-end gap-4">
        <Button variant="outline" onClick={() => onOpenChange(false)} className="bg-overlay/5 hover:bg-overlay/10 w-full sm:w-32">
          Cancel
        </Button>
        <Button
          variant="destructive"
          onClick={handleDeleteAccount}
          disabled={loading.delete}
          className="bg-red-500 text-white w-full sm:w-32"
        >
          {loading.delete ? 'Deleting...' : 'Delete'}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);