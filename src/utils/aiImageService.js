import { getAISettings } from './aiSummaryService';

// Generate note fields from image using Gemini 2.5 Flash
export const generateNoteFromImage = async (file) => {
  // Get AI settings
  const aiSettings = await getAISettings();
  if (!aiSettings || !aiSettings.enabled || !aiSettings.apiKey) {
    throw new Error('AI features are not enabled');
  }

  // Convert file to Base64
  const arrayBuffer = await file.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  let binary = '';
  for (const b of bytes) {
    binary += String.fromCharCode(b);
  }
  const base64Data = btoa(binary);

  // Construct prompt
  const promptText = `Analyze the provided image and extract a note with the following fields:
1. title - A concise title based on the image content
2. description - A brief summary (2-3 sentences)
3. content - The main body text extracted or inferred from the image

Respond with ONLY a valid JSON object with these exact keys: "title", "description", "content".`;

  // Build request payload
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
      // Temperature and topP control the randomness
      temperature: 0.2,
      topP: 0.95
    }
  };

  // Use Gemini 2.0 Flash model
  const endpoint = 'https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent';

  // Make API request
  try {
    const response = await fetch(`${endpoint}?key=${aiSettings.apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(`API request failed: ${errorData?.error?.message || response.statusText}`);
    }

    const data = await response.json();
    
    // Try to get structured JSON from the response
    try {
      // First check if response has a structured format
      const structuredResponse = data.candidates?.[0]?.content?.parts?.[0]?.functionResponse?.response;
      if (structuredResponse) {
        return structuredResponse;
      }
      
      // If not, try to extract from text
      const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!textResponse) {
        throw new Error('Invalid response format from AI image service');
      }

      // Try to extract JSON from response
      const jsonMatch = textResponse.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No valid JSON found in AI response');
      }

      // Parse the extracted JSON
      const noteFields = JSON.parse(jsonMatch[0]);
      
      // Validate required fields
      if (!noteFields.title || !noteFields.description || !noteFields.content) {
        throw new Error('AI response missing required fields');
      }
      
      return noteFields; // { title, description, content }
    } catch (err) {
      console.error('JSON parsing error:', err);
      
      // Attempt to create a structured response from unstructured text
      const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (textResponse) {
        // Create a basic structure even if AI didn't provide proper JSON
        return {
          title: "Note from Image",
          description: "Content extracted from image",
          content: textResponse.trim()
        };
      }
      throw new Error('Failed to parse response from AI service');
    }
  } catch (error) {
    console.error('Image processing error:', error);
    throw new Error(error.message || 'Failed to process image');
  }
}; 