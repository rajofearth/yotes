import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useNotes } from '../../hooks/useNotes';
import { Button } from '../../components/ui/button';
import { ArrowLeft, Save } from 'lucide-react';
import Editor from '@monaco-editor/react';

export default function NoteDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { notes, updateNote } = useNotes();
  const [note, setNote] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [content, setContent] = useState('');

  useEffect(() => {
    const currentNote = notes.find(n => n.id === id);
    if (currentNote) {
      setNote(currentNote);
      setContent(currentNote.content);
    }
  }, [id, notes]);

  const handleSave = async () => {
    try {
      await updateNote(id, {
        ...note,
        content,
        updatedAt: new Date().toISOString()
      });
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to save note:', error);
    }
  };

  if (!note) return null;

  return (
    <div className="min-h-screen bg-bg-primary">
      {/* Header */}
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
            <div>
              <h1 className="text-xl font-semibold tracking-tight">{note.title}</h1>
              <p className="text-sm text-text-primary/60">
                Last updated {new Date(note.updatedAt).toLocaleDateString()}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              onClick={() => setIsEditing(!isEditing)}
              className="text-sm"
            >
              {isEditing ? 'Preview' : 'Edit'}
            </Button>
            {isEditing && (
              <Button
                onClick={handleSave}
                className="text-sm flex items-center gap-2"
              >
                <Save className="h-4 w-4" />
                Save
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-[1920px] mx-auto px-4 py-8">
        {isEditing ? (
          <div className="border border-overlay/10 rounded-lg overflow-hidden">
            <Editor
              height="75vh"
              defaultLanguage="markdown"
              theme="vs-dark"
              value={content}
              onChange={setContent}
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                lineHeight: 1.6,
                wordWrap: 'on',
                lineNumbers: 'off',
                padding: { top: 16, bottom: 16 },
                scrollBeyondLastLine: false,
              }}
            />
          </div>
        ) : (
          <div 
            className="prose prose-invert max-w-none px-4 py-2"
            style={{ whiteSpace: 'pre-wrap' }}
          >
            {content}
          </div>
        )}
      </main>
    </div>
  );
} 