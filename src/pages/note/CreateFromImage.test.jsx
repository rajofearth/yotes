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

// Mock useAISettings hook
const mockUseAISettings = jest.fn();
jest.mock('../../hooks/useAISettings', () => ({
  useAISettings: () => mockUseAISettings(),
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
  const mockApiKey = "test-api-key-from-settings";

  // Helper to set AI settings mock
  const setAISettingsMock = (settings) => {
    mockUseAISettings.mockReturnValue({
      settings: settings.settings,
      loading: settings.loading || false,
      error: settings.error || null,
    });
  };

  beforeEach(() => {
    jest.clearAllMocks();
    geminiService.generateNoteFromImage.mockResolvedValue(mockGeminiResponse);
    mockCreateNote.mockResolvedValue({ id: 'newNoteId123' });
    // Default AI settings mock: enabled and with API key
    setAISettingsMock({
      settings: { enabled: true, apiKey: mockApiKey, model: 'gemini-pro-vision' },
      loading: false,
      error: null,
    });
  });

  const renderComponent = () => {
    return render(
      <MemoryRouter>
        <CreateFromImage />
      </MemoryRouter>
    );
  };

  it('should render initial state correctly when AI is enabled', () => {
    renderComponent();
    expect(screen.getByText('Create Note from Image')).toBeInTheDocument();
    expect(screen.getByText('Take Picture')).not.toBeDisabled();
    expect(screen.getByText('Upload Image')).not.toBeDisabled();
    expect(screen.getByText('Image preview will appear here.')).toBeInTheDocument();
    expect(screen.getByText('Process Image')).toBeDisabled(); // Disabled until image is selected
  });

  it('should allow image selection and display preview when AI is enabled', async () => {
    renderComponent();
    const file = new File(['dummy content'], 'example.png', { type: 'image/png' });
    // Assuming the hidden input is the next sibling of the "Upload Image" button
    const uploadButton = screen.getByRole('button', { name: /Upload Image/i });
    const uploadInput = uploadButton.nextSibling; 

    expect(uploadInput).toHaveClass('hidden'); // Make sure we got the right element

    fireEvent.change(uploadInput, { target: { files: [file] } });
    
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

  it('should call AI service with API key and display NoteForm when "Process Image" is clicked (AI enabled)', async () => {
    renderComponent();
    
    const file = new File(['dummy content'], 'example.png', { type: 'image/png' });
    const uploadButton = screen.getByRole('button', { name: /Upload Image/i });
    const uploadInput = uploadButton.nextSibling;
    fireEvent.change(uploadInput, { target: { files: [file] } });
    if (mockFileReaderInstance && mockFileReaderInstance.onloadend) mockFileReaderInstance.onloadend();
    await waitFor(() => expect(screen.getByAltText('Selected Preview')).toBeInTheDocument());

    fireEvent.click(screen.getByText('Process Image'));

    expect(screen.getByRole('button', { name: /Process Image/i })).toBeDisabled(); // Check for loader
    expect(geminiService.generateNoteFromImage).toHaveBeenCalledWith(file, mockApiKey);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Enter note title')).toBeInTheDocument();
    });
    
    expect(screen.getByPlaceholderText('Enter note title')).toHaveValue(mockGeminiResponse.title);
    expect(screen.getByPlaceholderText('Add a brief description (optional)')).toHaveValue(mockGeminiResponse.description);
    expect(screen.getByPlaceholderText('Start writing your note...')).toHaveValue(mockGeminiResponse.content);
    // Tag checking can be complex due to rendering; ensure generatedNote.tags is correct
    // This test primarily focuses on the call and form population.
  });

  it('should reflect user edits and call createNote with updated data (AI enabled)', async () => {
    renderComponent();

    const file = new File(['(⌐□_□)'], 'chucknorris.png', { type: 'image/png' });
    const uploadButton = screen.getByRole('button', { name: /Upload Image/i });
    const uploadInput = uploadButton.nextSibling;
    fireEvent.change(uploadInput, { target: { files: [file] } });
    if (mockFileReaderInstance && mockFileReaderInstance.onloadend) mockFileReaderInstance.onloadend();
    await waitFor(() => expect(screen.getByAltText('Selected Preview')).toBeInTheDocument());

    fireEvent.click(screen.getByText('Process Image'));
    await waitFor(() => expect(screen.getByPlaceholderText('Enter note title')).toBeInTheDocument());

    const titleInput = screen.getByPlaceholderText('Enter note title');
    fireEvent.change(titleInput, { target: { value: 'Manually Updated Title' } });
    
    const contentTextarea = screen.getByPlaceholderText('Start writing your note...');
    fireEvent.change(contentTextarea, { target: { value: 'Manually updated content.' } });

    fireEvent.click(screen.getByText('Save Note'));

    await waitFor(() => {
      expect(mockCreateNote).toHaveBeenCalledTimes(1);
    });
    
    expect(mockCreateNote).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Manually Updated Title',
      content: 'Manually updated content.',
      description: mockGeminiResponse.description,
      tags: mockGeminiResponse.tags,
    }));
    expect(mockNavigate).toHaveBeenCalledWith('/note/newNoteId123');
  });

  it('should display loading message for AI settings', () => {
    setAISettingsMock({ settings: null, loading: true, error: null });
    renderComponent();
    expect(screen.getByText('Loading AI settings...')).toBeInTheDocument();
  });

  it('should display error message if AI settings fail to load', () => {
    const error = new Error('Failed to load AI settings');
    setAISettingsMock({ settings: null, loading: false, error: error });
    renderComponent();
    expect(screen.getByText(`Error loading AI settings: ${error.message}`)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Go to Settings/i})).toBeInTheDocument();
  });

  it('should display "AI features disabled" message and disable buttons', () => {
    setAISettingsMock({ settings: { enabled: false, apiKey: mockApiKey }, loading: false, error: null });
    renderComponent();
    expect(screen.getByText(/AI features are currently disabled/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Take Picture/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Upload Image/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Process Image/i })).toBeDisabled();
     // Check tooltip / title attribute
    expect(screen.getByRole('button', { name: /Upload Image/i })).toHaveAttribute('title', /AI features are currently disabled/i);
  });

  it('should display "API key missing" message and disable buttons', () => {
    setAISettingsMock({ settings: { enabled: true, apiKey: null }, loading: false, error: null });
    renderComponent();
    expect(screen.getByText(/AI API Key not configured/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Take Picture/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Upload Image/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Process Image/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Upload Image/i })).toHaveAttribute('title', /AI API Key not configured/i);
  });
  
  it('should not call generateNoteFromImage if AI is disabled and process is attempted', async () => {
    setAISettingsMock({ settings: { enabled: false, apiKey: mockApiKey }, loading: false, error: null });
    renderComponent();

    const file = new File(['dummy content'], 'example.png', { type: 'image/png' });
    const uploadButton = screen.getByRole('button', { name: /Upload Image/i });
    const uploadInput = uploadButton.nextSibling;
    fireEvent.change(uploadInput, { target: { files: [file] } }); // Still allow image selection
    if (mockFileReaderInstance && mockFileReaderInstance.onloadend) mockFileReaderInstance.onloadend();
    await waitFor(() => expect(screen.getByAltText('Selected Preview')).toBeInTheDocument());
    
    fireEvent.click(screen.getByText('Process Image')); // Attempt to process
    
    expect(geminiService.generateNoteFromImage).not.toHaveBeenCalled();
    expect(screen.getByText('Error: AI features are disabled. Please enable them in settings.')).toBeInTheDocument();
  });

  it('should not call generateNoteFromImage if API key is missing and process is attempted', async () => {
    setAISettingsMock({ settings: { enabled: true, apiKey: null }, loading: false, error: null });
    renderComponent();

    const file = new File(['dummy content'], 'example.png', { type: 'image/png' });
    const uploadButton = screen.getByRole('button', { name: /Upload Image/i });
    const uploadInput = uploadButton.nextSibling;
    fireEvent.change(uploadInput, { target: { files: [file] } });
    if (mockFileReaderInstance && mockFileReaderInstance.onloadend) mockFileReaderInstance.onloadend();
    await waitFor(() => expect(screen.getByAltText('Selected Preview')).toBeInTheDocument());

    fireEvent.click(screen.getByText('Process Image'));
    
    expect(geminiService.generateNoteFromImage).not.toHaveBeenCalled();
    expect(screen.getByText('Error: AI API Key is not configured. Please set it in settings.')).toBeInTheDocument();
  });

  // Error handling for geminiService and createNote should still work with AI enabled
  it('should display error if geminiService fails (AI enabled)', async () => {
    geminiService.generateNoteFromImage.mockRejectedValueOnce(new Error('Gemini API Error'));
    renderComponent(); // AI enabled by default mock

    const file = new File(['dummy content'], 'example.png', { type: 'image/png' });
    const uploadButton = screen.getByRole('button', { name: /Upload Image/i });
    const uploadInput = uploadButton.nextSibling;
    fireEvent.change(uploadInput, { target: { files: [file] } });
    if (mockFileReaderInstance && mockFileReaderInstance.onloadend) mockFileReaderInstance.onloadend();
    await waitFor(() => expect(screen.getByText('Process Image')).not.toBeDisabled());
    
    fireEvent.click(screen.getByText('Process Image'));

    await waitFor(() => {
      expect(screen.getByText(/Error: Gemini API Error/i)).toBeInTheDocument();
    });
    expect(geminiService.generateNoteFromImage).toHaveBeenCalledWith(file, mockApiKey);
  });

  it('should display error if createNote fails (AI enabled)', async () => {
    mockCreateNote.mockRejectedValueOnce(new Error('Failed to save note'));
    renderComponent(); // AI enabled by default mock

    const file = new File(['dummy content'], 'example.png', { type: 'image/png' });
    const uploadButton = screen.getByRole('button', { name: /Upload Image/i });
    const uploadInput = uploadButton.nextSibling;
    fireEvent.change(uploadInput, { target: { files: [file] } });
    if (mockFileReaderInstance && mockFileReaderInstance.onloadend) mockFileReaderInstance.onloadend();
    await waitFor(() => expect(screen.getByText('Process Image')).not.toBeDisabled());
    fireEvent.click(screen.getByText('Process Image'));
    await waitFor(() => expect(screen.getByPlaceholderText('Enter note title')).toBeInTheDocument());

    fireEvent.click(screen.getByText('Save Note'));

    await waitFor(() => {
      expect(screen.getByText(/Error: Failed to save note/i)).toBeInTheDocument();
    });
  });
  
  it('should allow going back to image upload from note form view (AI enabled)', async () => {
    renderComponent(); // AI enabled by default mock
    const file = new File(['(⌐□_□)'], 'chucknorris.png', { type: 'image/png' });
    const uploadButton = screen.getByRole('button', { name: /Upload Image/i });
    const uploadInput = uploadButton.nextSibling;
    fireEvent.change(uploadInput, { target: { files: [file] } });
    if (mockFileReaderInstance && mockFileReaderInstance.onloadend) mockFileReaderInstance.onloadend();
    await waitFor(() => expect(screen.getByAltText('Selected Preview')).toBeInTheDocument());

    fireEvent.click(screen.getByText('Process Image'));
    await waitFor(() => expect(screen.getByPlaceholderText('Enter note title')).toBeInTheDocument());
    
    fireEvent.click(screen.getByText('Back to Image Upload'));
    
    await waitFor(() => {
      expect(screen.getByText('Create Note from Image')).toBeInTheDocument();
    });
    expect(screen.queryByPlaceholderText('Enter note title')).not.toBeInTheDocument();
    expect(screen.getByText('Image preview will appear here.')).toBeInTheDocument();
  });

});
