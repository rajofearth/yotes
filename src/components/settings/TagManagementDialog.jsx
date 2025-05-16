import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { TagManagementCard } from './TagManagementCard';
import { CreateTagDialog } from './CreateTagDialog';
import { DeleteTagDialog } from './DeleteTagDialog';
import { useTagManagement } from '../../hooks/useTagManagement';
import { useNotes } from '../../hooks/useNotes';

export const TagManagementDialog = ({ open, onOpenChange }) => {
    const { tags, notes, createTag, updateTag, deleteTag } = useNotes();
    const { tagState, setTagState, dialogs, setDialogs, handleTagAction } = useTagManagement({
        tags,
        createTag,
        updateTag,
        deleteTag,
    });

    // Calculate how many notes each tag is used in
    const tagUsageCounts = tags.reduce((counts, tag) => {
        // Count notes that have this tag - check both tags and tagIds fields
        const count = notes?.filter(note => {
            // Check if tag is in the tags array
            if (note.tags && Array.isArray(note.tags)) {
                return note.tags.some(tagId => tagId === tag.id || tagId === tag.id.toString());
            }
            
            // Check if tag is in the tagIds array (alternate format)
            if (note.tagIds && Array.isArray(note.tagIds)) {
                return note.tagIds.some(tagId => tagId === tag.id || tagId === tag.id.toString());
            }
            
            return false;
        }).length || 0;
        
        counts[tag.id] = count;
        return counts;
    }, {});

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
                    tagUsageCounts={tagUsageCounts}
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
                    tagUsageCount={tagState.tagToDelete ? tagUsageCounts[tagState.tagToDelete] : 0}
                />
            </DialogContent>
        </Dialog>
    );
};