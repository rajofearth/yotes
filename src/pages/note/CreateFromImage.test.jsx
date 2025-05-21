import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom'; // To provide routing context

import CreateFromImage from './CreateFromImage';
import * as geminiService from '../../utils/geminiService';
import * as useNotesHook from '../../hooks/useNotes';

// Mock react-router-dom
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

// Mock geminiService
jest.mock('../../utils/geminiService', () => ({
  generateNoteFromImage: jest.fn(),
}));

// Mock useNotes hook
const mockCreateNote = jest.fn();
const mockRefreshTags = jest.fn();
jest.mock('../../hooks/useNotes', () => ({
  useNotes: () => ({
    createNote: mockCreateNote,
    tags: [{ id: 'tag1', name: 'Tag 1' }, { id: 'tag2', name: 'Tag 2' }],
    refreshTags: mockRefreshTags,
  }),
}));

// Mock NoteForm - optional, but can simplify tests if its internal logic is complex
// For now, we'll test its interaction through props.
// jest.mock('../../components/note/NoteForm', () => ({
//   NoteForm: jest.fn(({ note, onNoteChange, onContentChange, titleInputRef, tags, onTagToggle, onCreateTag }) => (
//     <div data-testid="note-form">
//       <input data-testid="note-title-input" ref={titleInputRef} defaultValue={note.title} onChange={e => onNoteChange({ title: e.target.value })} />
//       <textarea data-testid="note-content-textarea" defaultValue={note.content} onChange={e => onContentChange(e.target.value)} />
//       {/* Add mock tags interaction if needed */}
//     </div>
//   )),
// }));


// Mocking FileReader
let mockFileReaderInstance;
const mockReadAsDataURL = jest.fn();
const mockFileReader = jest.fn(() => {
  mockFileReaderInstance = {
    readAsDataURL: mockReadAsDataURL,
    onloadend: null,
    result: 'data:image/png;base64,fakeimagedata',
  };
  return mockFileReaderInstance;
});
global.FileReader = mockFileReader;


describe('CreateFromImage Page', () => {
  const mockGeminiResponse = {
    title: "Test AI Title",
    description: "Test AI Description",
    content: "Test AI Content",
    tags: ["ai-tag1", "ai-tag2"],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    geminiService.generateNoteFromImage.mockResolvedValue(mockGeminiResponse);
    mockCreateNote.mockResolvedValue({ id: 'newNoteId123' });
  });

  const renderComponent = () => {
    return render(
      <MemoryRouter>
        <CreateFromImage />
      </MemoryRouter>
    );
  };

  it('should render initial state correctly', () => {
    renderComponent();
    expect(screen.getByText('Create Note from Image')).toBeInTheDocument();
    expect(screen.getByText('Take Picture')).toBeInTheDocument();
    expect(screen.getByText('Upload Image')).toBeInTheDocument();
    expect(screen.getByText('Image preview will appear here.')).toBeInTheDocument();
    expect(screen.getByText('Process Image')).toBeDisabled();
  });

  it('should allow image selection and display preview', async () => {
    renderComponent();
    const file = new File(['dummy content'], 'example.png', { type: 'image/png' });
    const uploadInput = screen.getByLabelText(/Upload Image/i, { selector: 'button' }).nextSibling; // Hacky way to get hidden input

    fireEvent.change(uploadInput, { target: { files: [file] } });
    
    // Simulate FileReader onloadend
    if (mockFileReaderInstance && mockFileReaderInstance.onloadend) {
      mockFileReaderInstance.onloadend();
    }

    await waitFor(() => {
      expect(screen.getByAltText('Selected Preview')).toBeInTheDocument();
      expect(screen.getByAltText('Selected Preview').src).toBe('data:image/png;base64,fakeimagedata');
    });
    expect(screen.getByText('Process Image')).not.toBeDisabled();
    expect(mockReadAsDataURL).toHaveBeenCalledWith(file);
  });

  it('should call AI service and display NoteForm when "Process Image" is clicked', async () => {
    renderComponent();
    
    // Simulate image upload first
    const file = new File(['dummy content'], 'example.png', { type: 'image/png' });
    const uploadInput = screen.getByLabelText(/Upload Image/i, { selector: 'button' }).nextSibling;
    fireEvent.change(uploadInput, { target: { files: [file] } });
    if (mockFileReaderInstance && mockFileReaderInstance.onloadend) mockFileReaderInstance.onloadend();
    await waitFor(() => expect(screen.getByAltText('Selected Preview')).toBeInTheDocument());

    // Click Process Image
    fireEvent.click(screen.getByText('Process Image'));

    expect(screen.getByRole('button', { name: /Process Image/i })).toHaveAttribute('disabled'); // Check for loader, implicitly
    expect(geminiService.generateNoteFromImage).toHaveBeenCalledWith(file); // or selectedImageFile

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Enter note title')).toBeInTheDocument();
    });
    
    expect(screen.getByPlaceholderText('Enter note title').value).toBe(mockGeminiResponse.title);
    // Check if NoteForm's description and content are populated (assuming NoteForm renders them in accessible textareas/inputs)
    expect(screen.getByPlaceholderText('Add a brief description (optional)')).toHaveValue(mockGeminiResponse.description);
    expect(screen.getByPlaceholderText('Start writing your note...')).toHaveValue(mockGeminiResponse.content);
    // Check for tags (this depends on how TagSelector renders them)
    // For example, if tags are rendered as buttons:
    mockGeminiResponse.tags.forEach(tag => {
      // This check is a bit loose as TagSelector might use tag IDs or names.
      // The mock `generateNoteFromImage` returns tag names, while `useNotes` provides tag objects.
      // The component's `handleCreateTag` and `handleTagToggle` use IDs.
      // The `generatedNote.tags` will store IDs like "ai-tag1", "ai-tag2".
      // We'd need to ensure TagSelector displays something findable for these.
      // For now, we assume `TagSelector` displays tags based on the IDs passed in `note.tags`.
      // This part might need adjustment based on `TagSelector`'s actual rendering.
      // expect(screen.getByText(tag, { exact: false })).toBeInTheDocument(); // This is too simple.
    });
  });

  it('should reflect user edits in the title and call createNote with updated data', async () => {
    renderComponent();

    // 1. Upload image
    const file = new File(['(⌐□_□)'], 'chucknorris.png', { type: 'image/png' });
    const uploadInput = screen.getByLabelText(/Upload Image/i, { selector: 'button' }).nextSibling;
    fireEvent.change(uploadInput, { target: { files: [file] } });
    if (mockFileReaderInstance && mockFileReaderInstance.onloadend) mockFileReaderInstance.onloadend();
    await waitFor(() => expect(screen.getByAltText('Selected Preview')).toBeInTheDocument());

    // 2. Process image
    fireEvent.click(screen.getByText('Process Image'));
    await waitFor(() => expect(screen.getByPlaceholderText('Enter note title')).toBeInTheDocument());

    // 3. Edit title
    const titleInput = screen.getByPlaceholderText('Enter note title');
    fireEvent.change(titleInput, { target: { value: 'Manually Updated Title' } });
    expect(titleInput.value).toBe('Manually Updated Title');
    
    // 4. Edit content (via NoteForm's textarea)
    const contentTextarea = screen.getByPlaceholderText('Start writing your note...');
    fireEvent.change(contentTextarea, { target: { value: 'Manually updated content.' } });
    expect(contentTextarea.value).toBe('Manually updated content.');

    // 5. Save note
    fireEvent.click(screen.getByText('Save Note'));

    await waitFor(() => {
      expect(mockCreateNote).toHaveBeenCalledTimes(1);
    });
    
    const expectedNoteData = {
      title: 'Manually Updated Title',
      description: mockGeminiResponse.description, // Description wasn't changed in this test
      content: 'Manually updated content.',
      tags: mockGeminiResponse.tags, // Tags weren't changed in this test
      isPinned: false,
      isPublic: false,
      sharedWith: [],
    };
    expect(mockCreateNote).toHaveBeenCalledWith(expect.objectContaining(expectedNoteData));
    expect(mockNavigate).toHaveBeenCalledWith('/note/newNoteId123');
  });
  
  it('should display error if geminiService fails', async () => {
    geminiService.generateNoteFromImage.mockRejectedValueOnce(new Error('Gemini API Error'));
    renderComponent();

    const file = new File(['dummy content'], 'example.png', { type: 'image/png' });
    const uploadInput = screen.getByLabelText(/Upload Image/i, { selector: 'button' }).nextSibling;
    fireEvent.change(uploadInput, { target: { files: [file] } });
    if (mockFileReaderInstance && mockFileReaderInstance.onloadend) mockFileReaderInstance.onloadend();
    await waitFor(() => expect(screen.getByText('Process Image')).not.toBeDisabled());
    
    fireEvent.click(screen.getByText('Process Image'));

    await waitFor(() => {
      expect(screen.getByText(/Error: Gemini API Error/i)).toBeInTheDocument();
    });
  });

  it('should display error if createNote fails', async () => {
    mockCreateNote.mockRejectedValueOnce(new Error('Failed to save note'));
    renderComponent();

    // Go through image upload and process
    const file = new File(['dummy content'], 'example.png', { type: 'image/png' });
    const uploadInput = screen.getByLabelText(/Upload Image/i, { selector: 'button' }).nextSibling;
    fireEvent.change(uploadInput, { target: { files: [file] } });
    if (mockFileReaderInstance && mockFileReaderInstance.onloadend) mockFileReaderInstance.onloadend();
    await waitFor(() => expect(screen.getByText('Process Image')).not.toBeDisabled());
    fireEvent.click(screen.getByText('Process Image'));
    await waitFor(() => expect(screen.getByPlaceholderText('Enter note title')).toBeInTheDocument());

    // Click save
    fireEvent.click(screen.getByText('Save Note'));

    await waitFor(() => {
      expect(screen.getByText(/Error: Failed to save note/i)).toBeInTheDocument();
    });
  });
  
  it('should allow going back to image upload from note form view', async () => {
    renderComponent();
    // 1. Upload image
    const file = new File(['(⌐□_□)'], 'chucknorris.png', { type: 'image/png' });
    const uploadInput = screen.getByLabelText(/Upload Image/i, { selector: 'button' }).nextSibling;
    fireEvent.change(uploadInput, { target: { files: [file] } });
    if (mockFileReaderInstance && mockFileReaderInstance.onloadend) mockFileReaderInstance.onloadend();
    await waitFor(() => expect(screen.getByAltText('Selected Preview')).toBeInTheDocument());

    // 2. Process image
    fireEvent.click(screen.getByText('Process Image'));
    await waitFor(() => expect(screen.getByPlaceholderText('Enter note title')).toBeInTheDocument());
    
    // 3. Click "Back to Image Upload"
    fireEvent.click(screen.getByText('Back to Image Upload'));
    
    await waitFor(() => {
      expect(screen.getByText('Create Note from Image')).toBeInTheDocument(); // Back to initial view
    });
    expect(screen.queryByPlaceholderText('Enter note title')).not.toBeInTheDocument(); // NoteForm is gone
    expect(screen.getByText('Image preview will appear here.')).toBeInTheDocument(); // Image preview placeholder is back
  });

});
