import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { TagManagementCard } from './TagManagementCard';
import { CreateTagDialog } from './CreateTagDialog';
import { DeleteTagDialog } from './DeleteTagDialog';
import { useTagManagement } from '../../hooks/useTagManagement';
import { useNotes } from '../../hooks/useNotes';

export const TagManagementDialog = ({ open, onOpenChange }) => {
    const { tags, createTag, updateTag, deleteTag } = useNotes();
    const { tagState, setTagState, dialogs, setDialogs, handleTagAction } = useTagManagement({
        tags,
        createTag,
        updateTag,
        deleteTag,
    });

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="bg-bg-primary border-overlay/10 shadow-lg max-w-2xl">
                <DialogHeader>
                    <DialogTitle className="text-xl font-semibold text-text-primary">Manage Tags</DialogTitle>
                    <DialogDescription className="text-text-primary/60">
                        Create, edit, or delete tags to organize your notes effectively.
                    </DialogDescription>
                </DialogHeader>
                <TagManagementCard
                    tags={tags}
                    tagState={tagState}
                    setTagState={setTagState}
                    setDialogs={setDialogs}
                    handleTagAction={handleTagAction}
                />
                <CreateTagDialog
                    open={dialogs.createTag}
                    onOpenChange={val => setDialogs(prev => ({ ...prev, createTag: val }))}
                    tagState={tagState}
                    setTagState={setTagState}
                    handleTagAction={handleTagAction}
                />
                <DeleteTagDialog
                    open={dialogs.deleteTag}
                    onOpenChange={val => setDialogs(prev => ({ ...prev, deleteTag: val }))}
                    loading={false} // Assuming no loading state for simplicity
                    handleTagAction={handleTagAction}
                    tagId={tagState.tagToDelete}
                />
            </DialogContent>
        </Dialog>
    );
};