import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotes } from '../../hooks/useNotes';
import { useToast } from '../../contexts/ToastContext';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { ArrowLeft, Save, Wand2 } from 'lucide-react';
import { Badge } from '../../components/ui/badge';
import { Textarea } from '../../components/ui/textarea';

export default function CreateNote() {
    const navigate = useNavigate();
    const { createNote, tags, createTag } = useNotes();
    const showToast = useToast();
    const [isSaving, setIsSaving] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);
    const [note, setNote] = useState({
        title: '',
        description: '',
        content: '',
        tags: [] // Stores tag IDs
    });

    useEffect(() => {
        if (note.title || note.description || note.content || note.tags.length > 0) {
            setHasChanges(true);
        } else {
            setHasChanges(false);
        }
    }, [note]);

    const handleSave = async () => {
        if (!hasChanges) return;
        setIsSaving(true);
        try {
            await createNote({
                ...note,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            });
            showToast('Note saved successfully', 'success');
            navigate('/');
        } catch (error) {
            showToast('Failed to save note', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleTagToggle = (tagId) => {
        setNote(prev => ({
            ...prev,
            tags: prev.tags.includes(tagId)
                ? prev.tags.filter(id => id !== tagId)
                : [...prev.tags, tagId]
        }));
    };

    const handleTagInput = async (e) => {
        if (e.key === 'Enter' && e.target.value) {
            e.preventDefault();
            const newTagName = e.target.value.trim();
            const existingTag = tags.find(tag => tag.name.toLowerCase() === newTagName.toLowerCase());
            if (existingTag) {
                if (!note.tags.includes(existingTag.id)) {
                    setNote(prev => ({
                        ...prev,
                        tags: [...prev.tags, existingTag.id]
                    }));
                }
            } else {
                try {
                    const newTag = await createTag({ name: newTagName });
                    setNote(prev => ({
                        ...prev,
                        tags: [...prev.tags, newTag.id]
                    }));
                } catch (error) {
                    showToast('Failed to create tag', 'error');
                }
            }
            e.target.value = '';
        }
    };

    const removeTag = (tagId) => {
        setNote(prev => ({
            ...prev,
            tags: prev.tags.filter(id => id !== tagId)
        }));
    };

    const generateWithAI = async () => {
        showToast('AI generation coming soon!', 'info');
    };

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
                            value={note.title}
                            onChange={(e) => setNote(prev => ({ ...prev, title: e.target.value }))}
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
                            value={note.description}
                            onChange={(e) => setNote(prev => ({ ...prev, description: e.target.value }))}
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
                            {note.tags.map((tagId) => {
                                const tag = tags.find(t => t.id === tagId);
                                return tag ? (
                                    <Badge
                                        key={tagId}
                                        variant="secondary"
                                        className="flex items-center gap-1"
                                    >
                                        {tag.name}
                                        <button
                                            onClick={() => removeTag(tagId)}
                                            className="ml-1 hover:text-red-500"
                                        >
                                            ×
                                        </button>
                                    </Badge>
                                ) : null;
                            })}
                        </div>
                        <div className="space-y-2">
                            {tags.length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                    {tags.map(tag => (
                                        <label key={tag.id} className="flex items-center gap-1">
                                            <input
                                                type="checkbox"
                                                checked={note.tags.includes(tag.id)}
                                                onChange={() => handleTagToggle(tag.id)}
                                            />
                                            {tag.name}
                                        </label>
                                    ))}
                                </div>
                            )}
                            <Input
                                type="text"
                                placeholder="Add new tag (press Enter)"
                                className="w-full"
                                onKeyDown={handleTagInput}
                            />
                        </div>
                    </div>
                </div>
                <Textarea
                    placeholder="Start writing your note..."
                    className="min-h-[50vh] bg-overlay/5 border-overlay/10 resize-none"
                    value={note.content}
                    onChange={(e) => setNote(prev => ({ ...prev, content: e.target.value }))}
                />
            </main>
        </div>
    );
}