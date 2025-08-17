import { convex } from '../lib/convexClient.tsx';
import { api } from '../../convex/_generated/api';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateText } from 'ai';
import { decryptString } from '../lib/e2ee';

const getAISettings = async (userId) => {
  try {
    if (!userId) return null;
    const settingsRaw = await convex.query(api.ai.getSettingsRaw, { userId });
    if (!settingsRaw || !settingsRaw.enabled || !settingsRaw.apiKeyEnc) {
      return { enabled: false, apiKey: null };
    }
    const dek = window.__yotesDek;
    if (!dek) {
      throw new Error('Encryption key not available');
    }
    const apiKey = await decryptString(dek, settingsRaw.apiKeyEnc);
    return { enabled: settingsRaw.enabled, apiKey };
  } catch (error) {
    console.error('Error fetching AI settings:', error);
    return null;
  }
};

// Check if AI features are available
export const canUseAIFeatures = async (isOnline, userId) => {
  if (!isOnline) return false;
  const aiSettings = await getAISettings(userId);
  return aiSettings && aiSettings.enabled && aiSettings.apiKey;
};

// Generate structured summary for search results using Gemini API
export const generateSearchSummary = async (searchResults, searchQuery, userId) => {
  const aiSettings = await getAISettings(userId);
  if (!aiSettings || !aiSettings.enabled || !aiSettings.apiKey) {
    throw new Error('AI features are not enabled');
  }
  if (!searchResults || searchResults.length === 0) {
    return null;
  }

  const googleProvider = createGoogleGenerativeAI({ apiKey: aiSettings.apiKey });
  const model = googleProvider('gemini-2.5-flash-lite');
  const formattedResults = searchResults.map(note => ({
    id: note.id,
    title: note.title,
    content: note.content.substring(0, 200) + (note.content.length > 200 ? '...' : ''),
    tags: note.tags || [],
    createdAt: note.createdAt
  }));

  const prompt = `You are a helpful AI summarizing search results for a notes application. Analyze these results for the query "${searchQuery}" and provide a structured summary.

Search Results: ${JSON.stringify(formattedResults)}

Generate JSON only with this exact structure:
{
  "overview": string,
  "themes": string[],
  "takeaways": string[],
  "suggestedTags": string[]
}

Respond with ONLY the JSON object.`;

  const { text } = await generateText({
    model,
    tools: {
      google_search: googleProvider.tools.googleSearch({}),
      url_context: googleProvider.tools.urlContext({}),
    },
    prompt
  });

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('No valid JSON found in AI response');
  }
  try {
    return JSON.parse(jsonMatch[0]);
  } catch (err) {
    throw new Error('Failed to parse summary from AI response');
  }
};

export { getAISettings };