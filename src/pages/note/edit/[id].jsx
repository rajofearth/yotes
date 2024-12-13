import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useNotes } from '../../../hooks/useNotes';
import { useToast } from '../../../contexts/ToastContext';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { ArrowLeft, Save, Wand2 } from 'lucide-react';
import { Badge } from '../../../components/ui/badge';
import { Textarea } from '../../../components/ui/textarea';

export default function EditNote() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { notes, updateNote } = useNotes();
    const showToast = useToast();
    const [isSaving, setIsSaving] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);
    const [note, setNote] = useState(null);

    useEffect(() => {
        const currentNote = notes.find(n => n.id === id);
        if (currentNote) {
            setNote(currentNote);
        }
    }, [id, notes]);

    useEffect(() => {
        if (note) {
            const originalNote = notes.find(n => n.id === id);
            const isTitleChanged = originalNote.title !== note.title;
            const isDescriptionChanged = originalNote.description !== note.description;
            const isContentChanged = originalNote.content !== note.content;
            const areTagsChanged = JSON.stringify(originalNote.tags) !== JSON.stringify(note.tags);

            setHasChanges(isTitleChanged || isDescriptionChanged || isContentChanged || areTagsChanged);
        }
    }, [note, id, notes]);

    const handleSave = async () => {
        if (!hasChanges) return;

        setIsSaving(true);
        try {
            await updateNote(id, {
                ...note,
                updatedAt: new Date().toISOString()
            });
            showToast('Note updated successfully', 'success');
            navigate('/', { state: { refresh: true } });
        } catch (error) {
            showToast('Failed to update note', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleTagInput = (e) => {
        if (e.key === 'Enter' && e.target.value) {
            e.preventDefault();
            const newTag = e.target.value.trim();
            if (!note.tags.includes(newTag)) {
                setNote(prev => ({
                    ...prev,
                    tags: [...prev.tags, newTag]
                }));
            }
            e.target.value = '';
        }
    };

    const removeTag = (tagToRemove) => {
        setNote(prev => ({
            ...prev,
            tags: prev.tags.filter(tag => tag !== tagToRemove)
        }));
    };

    const generateWithAI = async () => {
        // AI generation logic here
        showToast('AI generation coming soon!', 'info');
    };

    if (!note) {
        return <div className="min-h-screen bg-bg-primary flex items-center justify-center">
            <div className="text-text-primary">Loading...</div>
        </div>;
    }

    return (
        <div className="min-h-screen bg-bg-primary">
            <header className="border-b border-overlay/10">
                <div className="max-w-[1920px] mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => navigate('/')}
                            className="text-text-primary/60 hover:text-text-primary"
                        >
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                        <Input
                            type="text"
                            placeholder="Note title"
                            className="text-xl font-semibold bg-transparent border-none focus-visible:ring-0 p-0 h-auto placeholder:text-text-primary/40"
                            value={note.title || ''}
                            onChange={(e) => {
                                setNote(prev => ({ ...prev, title: e.target.value }));
                            }}
                        />
                    </div>
                    <Button
                        onClick={handleSave}
                        disabled={!hasChanges || isSaving}
                        className={`flex items-center gap-2 ${!hasChanges ? 'opacity-50' : ''}`}
                    >
                        <Save className="h-4 w-4" />
                        {isSaving ? 'Saving...' : 'Save'}
                    </Button>
                </div>
            </header>

            <main className="max-w-[1920px] mx-auto px-4 py-8 space-y-8">
                <div className="space-y-4">
                    <div className="flex items-center gap-2">
                        <Input
                            type="text"
                            placeholder="Add a brief description"
                            className="flex-1"
                            value={note.description || ''}
                            onChange={(e) => {
                                setNote(prev => ({ ...prev, description: e.target.value }));
                            }}
                        />
                        <Button
                            variant="outline"
                            onClick={generateWithAI}
                            className="flex items-center gap-2"
                        >
                            <Wand2 className="h-4 w-4" />
                            Generate with AI
                        </Button>
                    </div>
                    <div className="space-y-2">
                        <div className="flex flex-wrap gap-2">
                            {note.tags?.map((tag, index) => (
                                <Badge
                                    key={index}
                                    variant="secondary"
                                    className="flex items-center gap-1"
                                >
                                    {tag}
                                    <button
                                        onClick={() => removeTag(tag)}
                                        className="ml-1 hover:text-red-500"
                                    >
                                        ×
                                    </button>
                                </Badge>
                            ))}
                        </div>
                        <Input
                            type="text"
                            placeholder="Add tags (press Enter)"
                            className="w-full"
                            onKeyDown={handleTagInput}
                        />
                    </div>
                </div>

                <Textarea
                    placeholder="Start writing your note..."
                    className="min-h-[50vh] bg-overlay/5 border-overlay/10 resize-none"
                    value={note.content || ''}
                    onChange={(e) => {
                        setNote(prev => ({ ...prev, content: e.target.value }));
                    }}
                />
            </main>
        </div>
    );
}