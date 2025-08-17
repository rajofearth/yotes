import { getAISettings } from './aiSummaryService';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateText } from 'ai';

// Generate note fields from image using Gemini 2.5 Flash
export const generateNoteFromImage = async (file, userId) => {
  const aiSettings = await getAISettings(userId);
  if (!aiSettings || !aiSettings.enabled || !aiSettings.apiKey) {
    throw new Error('AI features are not enabled');
  }

  try {
    const arrayBuffer = await file.arrayBuffer();
    const googleProvider = createGoogleGenerativeAI({ apiKey: aiSettings.apiKey });
    const model = googleProvider('gemini-2.5-flash');

    const promptText = `Analyze the provided image and extract a note with the following fields:\n\n` +
      `1. title - A concise title based on the image content\n` +
      `2. description - A brief summary (2-3 sentences)\n` +
      `3. content - The main body text extracted or inferred from the image\n\n` +
      `Respond with ONLY a valid JSON object with these exact keys: "title", "description", "content".`;

    const result = await generateText({
      model,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', image: new Uint8Array(arrayBuffer), mediaType: file.type },
            { type: 'text', text: promptText },
          ],
        },
      ],
      temperature: 0.2,
      topP: 0.95,
    });

    const textResponse = result.text?.trim();
    if (!textResponse) {
      throw new Error('Invalid response format from AI image service');
    }

    const jsonMatch = textResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      // Fallback: return plain text as content
      return {
        title: 'Note from Image',
        description: 'Content extracted from image',
        content: textResponse,
      };
    }

    const noteFields = JSON.parse(jsonMatch[0]);
    if (!noteFields.title || !noteFields.description || !noteFields.content) {
      throw new Error('AI response missing required fields');
    }
    return noteFields;
  } catch (error) {
    throw new Error(error.message || 'Failed to process image');
  }
}; 