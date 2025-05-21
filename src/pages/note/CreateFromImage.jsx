import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Camera, Upload, ArrowRight, Loader2, AlertTriangle, Save } from 'lucide-react'; // Icons
import { generateNoteFromImage } from '../../utils/geminiService';
import { NoteForm } from '../../components/note/NoteForm';
import { useNotes } from '../../hooks/useNotes';

export default function CreateFromImage() {
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedImageFile, setSelectedImageFile] = useState(null); // To store the File object
  const [generatedNote, setGeneratedNote] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingError, setProcessingError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  const fileInputRef = useRef(null);
  const navigate = useNavigate();
  const { createNote, tags: allTags, refreshTags } = useNotes(); // Assuming useNotes provides tags and a way to refresh them

  // Refs for NoteForm inputs
  const titleInputRef = useRef(null);
  const descriptionRef = useRef(null);
  const contentRef = useRef(null);

  useEffect(() => {
    // Fetch or refresh tags when the component mounts
    refreshTags?.(); 
  }, [refreshTags]);

  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedImageFile(file); // Store the file object
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result); // This is the base64 string for preview
      };
      reader.readAsDataURL(file);
    }
  };

  const triggerFileDialog = () => {
    fileInputRef.current.click();
  };

  const handleProcessImage = async () => {
    if (!selectedImageFile) return; // Use selectedImageFile
    setIsProcessing(true);
    setProcessingError(null);
    try {
      // Pass selectedImageFile (File object) or selectedImage (base64 string)
      // depending on what generateNoteFromImage expects.
      // For this example, let's assume it can handle the base64 string (selectedImage)
      // or we can adapt it to send selectedImageFile if it's a true API call.
      const noteData = await generateNoteFromImage(selectedImageFile); 
      setGeneratedNote({
        title: noteData.title || '',
        description: noteData.description || '',
        content: noteData.content || '',
        tags: noteData.tags || [], // Ensure tags is an array
        isPublic: false, // Default value
        sharedWith: [], // Default value
        isPinned: false, // Default value
      });
      // Optionally clear selected image after processing to hide upload UI
      // setSelectedImage(null); 
      // setSelectedImageFile(null);
    } catch (error) {
      console.error("Error processing image:", error);
      setProcessingError(error.message || "Failed to generate note from image.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleNoteChange = useCallback((updatedField) => {
    setGeneratedNote(prevNote => ({ ...prevNote, ...updatedField }));
  }, []);
  
  const handleNoteContentChange = useCallback((newContent) => {
    setGeneratedNote(prevNote => ({ ...prevNote, content: newContent }));
  }, []);

  const handleTagToggle = useCallback((tagId) => {
    setGeneratedNote(prevNote => {
      const newTags = prevNote.tags.includes(tagId)
        ? prevNote.tags.filter(t => t !== tagId)
        : [...prevNote.tags, tagId];
      return { ...prevNote, tags: newTags };
    });
  }, []);

  const handleCreateTag = useCallback(async (tagName) => {
    // This is a simplified version. Ideally, useNotes would handle tag creation
    // and return the new tag object (including its ID).
    // For now, we'll just add the name. If your TagSelector/NoteForm expects tag objects, adjust accordingly.
    const newTag = { id: tagName.toLowerCase().replace(/\s+/g, '-'), name: tagName }; // Mock ID
    
    setGeneratedNote(prevNote => ({
      ...prevNote,
      tags: [...prevNote.tags, newTag.id] // Assuming tags are stored by ID
    }));
    // Potentially add to allTags if not automatically updated by useNotes
    // This part depends on how useNotes and TagSelector manage the global list of tags
    if (allTags && !allTags.find(t => t.id === newTag.id)) {
        // You might need a function in useNotes to add a tag to the global list
        // and then refreshTags() or similar.
        // For now, this won't update the global `allTags` used by TagSelector unless `useNotes` handles it.
        console.warn("New tag created locally. Global tag list might need update.");
    }
    return newTag; // Return the new tag, as TagSelector might expect this
  }, [allTags]);


  const handleSaveNote = async () => {
    if (!generatedNote) return;
    setIsSaving(true);
    setSaveError(null);
    try {
      // The NoteForm directly updates generatedNote's title via its own input,
      // so we ensure title is captured from there if NoteForm doesn't use onNoteChange for title.
      // However, the provided NoteForm structure does not have a title field managed by `onNoteChange`.
      // We will assume the title is part of `generatedNote` state.
      // If NoteForm has a separate title input, its value needs to be synced to `generatedNote.title`.
      // For now, let's assume `generatedNote.title` is up-to-date.

      const noteToSave = {
        ...generatedNote,
        title: titleInputRef.current?.value || generatedNote.title, // Get title from ref if NoteForm has its own
        // description and content are handled by onNoteChange or specific handlers
      };

      const newNote = await createNote(noteToSave);
      if (newNote && newNote.id) {
        navigate(`/note/${newNote.id}`);
      } else {
        navigate('/');
      }
    } catch (error) {
      console.error("Error saving note:", error);
      setSaveError(error.message || "Failed to save the note.");
    } finally {
      setIsSaving(false);
    }
  };

  if (generatedNote) {
    return (
      <div className="container mx-auto p-4 sm:p-6 lg:p-8 max-w-4xl">
        <Card className="bg-bg-primary border-overlay/10 shadow-lg">
          <CardHeader>
            <Input
                ref={titleInputRef}
                placeholder="Enter note title"
                defaultValue={generatedNote.title}
                className="text-2xl font-semibold text-text-primary bg-transparent border-0 focus:ring-0 focus:border-0 p-0 h-auto"
                // onChange={(e) => handleNoteChange({ title: e.target.value })} // Alternative: update title on change
            />
          </CardHeader>
          <CardContent className="space-y-6">
            {saveError && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
                <strong className="font-bold">Error: </strong>
                <span className="block sm:inline">{saveError}</span>
              </div>
            )}
            <NoteForm
              note={generatedNote}
              onNoteChange={handleNoteChange} // For general fields if NoteForm uses it
              onDescriptionChange={(desc) => handleNoteChange({ description: desc })} // More specific if needed
              onContentChange={handleNoteContentChange} // Pass the specific handler for content
              descriptionRef={descriptionRef}
              contentRef={contentRef}
              titleInputRef={titleInputRef} // Pass if NoteForm handles title directly
              tags={allTags || []} // Pass all available tags
              onTagToggle={handleTagToggle}
              onCreateTag={handleCreateTag}
            />
            <div className="mt-8 flex justify-end gap-4">
               <Button
                variant="outline"
                onClick={() => {
                  setGeneratedNote(null);
                  setSelectedImage(null);
                  setSelectedImageFile(null);
                  setProcessingError(null);
                }}
                className="border-primary text-primary hover:bg-primary/10"
              >
                Back to Image Upload
              </Button>
              <Button
                onClick={handleSaveNote}
                disabled={isSaving}
                className="bg-primary text-primary-foreground hover:bg-primary/90 min-w-[120px]"
              >
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save Note
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8 max-w-2xl">
      <Card className="bg-bg-primary border-overlay/10 shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-semibold text-text-primary text-center">
            Create Note from Image
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {!selectedImage && (
            <div className="flex flex-col sm:flex-row justify-around items-center gap-4">
              <Button
                variant="outline"
                className="w-full sm:w-auto border-primary text-primary hover:bg-primary/10"
                onClick={() => console.log('Take Picture clicked')} // Placeholder action
              >
                <Camera className="mr-2 h-5 w-5" />
                Take Picture
              </Button>
              <Button
                variant="outline"
                className="w-full sm:w-auto border-primary text-primary hover:bg-primary/10"
                onClick={triggerFileDialog}
              >
                <Upload className="mr-2 h-5 w-5" />
                Upload Image
              </Button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageUpload}
                accept="image/*"
                className="hidden"
              />
            </div>
          )}

          {selectedImage && (
            <div className="mt-6 border border-dashed border-overlay/20 rounded-lg p-4 min-h-[200px] flex flex-col justify-center items-center bg-overlay/5">
              <img
                src={selectedImage}
                alt="Selected Preview"
                className="max-h-80 max-w-full rounded-md object-contain"
              />
               <Button
                variant="ghost"
                size="sm"
                onClick={() => { setSelectedImage(null); setSelectedImageFile(null); fileInputRef.current.value = null; }}
                className="mt-4 text-sm text-text-secondary hover:text-text-primary"
              >
                Clear Image
              </Button>
            </div>
          )}

          {!selectedImage && !isProcessing && (
             <div className="text-center text-text-primary/60 mt-6 border border-dashed border-overlay/20 rounded-lg p-4 min-h-[200px] flex flex-col justify-center items-center bg-overlay/5">
              <ImageIcon className="mx-auto h-12 w-12 mb-2" />
              <p>Image preview will appear here.</p>
              <p className="text-sm">Take a picture or upload an image to get started.</p>
            </div>
          )}
          
          {processingError && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mt-4" role="alert">
              <strong className="font-bold"><AlertTriangle className="inline mr-2 h-5 w-5" />Error: </strong>
              <span className="block sm:inline">{processingError}</span>
            </div>
          )}

          <div className="mt-8 flex justify-end">
            <Button
              onClick={handleProcessImage}
              disabled={!selectedImage || isProcessing}
              className="bg-primary text-primary-foreground hover:bg-primary/90 min-w-[150px]"
            >
              {isProcessing ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : (
                <ArrowRight className="mr-2 h-5 w-5" />
              )}
              Process Image
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Fallback ImageIcon if lucide-react's one is not directly used or for placeholder purposes
const ImageIcon = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
    <circle cx="8.5" cy="8.5" r="1.5"></circle>
    <polyline points="21 15 16 10 5 21"></polyline>
  </svg>
);
