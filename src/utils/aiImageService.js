import { getAISettings } from './aiSummaryService';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateObject } from 'ai';
import { z } from 'zod';

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

    const NoteSchema = z.object({
      title: z.string().min(1).max(160),
      description: z.string().min(1).max(600),
      content: z.string().min(1),
    });

    const { object } = await generateObject({
      model,
      schema: NoteSchema,
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
      maxRetries: 1,
    });
    return object;
  } catch (error) {
    throw new Error(error.message || 'Failed to process image');
  }
}; 