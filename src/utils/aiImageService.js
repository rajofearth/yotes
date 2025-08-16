import { getAISettings } from './aiSummaryService';

// Generate note fields from image using Gemini 2.5 Flash
export const generateNoteFromImage = async (file, userId) => {
  const aiSettings = await getAISettings(userId);
  if (!aiSettings || !aiSettings.enabled || !aiSettings.apiKey) {
    throw new Error('AI features are not enabled');
  }

  const arrayBuffer = await file.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  let binary = '';
  for (const b of bytes) {
    binary += String.fromCharCode(b);
  }
  const base64Data = btoa(binary);

  const promptText = `Analyze the provided image and extract a note with the following fields:
1. title - A concise title based on the image content
2. description - A brief summary (2-3 sentences)
3. content - The main body text extracted or inferred from the image

Respond with ONLY a valid JSON object with these exact keys: "title", "description", "content".`;

  const payload = {
    contents: [
      {
        parts: [
          { inlineData: { mimeType: file.type, data: base64Data } },
          { text: promptText }
        ]
      }
    ],
    generationConfig: {
      temperature: 0.2,
      topP: 0.95
    }
  };

  const endpoint = 'https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent';

  try {
    const response = await fetch(`${endpoint}`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'x-goog-api-key': aiSettings.apiKey
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(`API request failed: ${errorData?.error?.message || response.statusText}`);
    }

    const data = await response.json();
    
    try {
      const structuredResponse = data.candidates?.[0]?.content?.parts?.[0]?.functionResponse?.response;
      if (structuredResponse) {
        return structuredResponse;
      }
      
      const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!textResponse) {
        throw new Error('Invalid response format from AI image service');
      }

      const jsonMatch = textResponse.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No valid JSON found in AI response');
      }

      const noteFields = JSON.parse(jsonMatch[0]);
      
      if (!noteFields.title || !noteFields.description || !noteFields.content) {
        throw new Error('AI response missing required fields');
      }
      
      return noteFields; // { title, description, content }
    } catch (err) {
      const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (textResponse) {
        return {
          title: "Note from Image",
          description: "Content extracted from image",
          content: textResponse.trim()
        };
      }
      throw new Error('Failed to parse response from AI service');
    }
  } catch (error) {
    throw new Error(error.message || 'Failed to process image');
  }
}; 