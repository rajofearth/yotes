import { convex } from '../lib/convexClient.tsx';
import { api } from '../../convex/_generated/api';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateObject } from 'ai';
import { z } from 'zod';
import { decryptString, encryptString } from '../lib/e2ee';

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

export const canUseAIFeatures = async (isOnline, userId) => {
  if (!isOnline) return false;
  const aiSettings = await getAISettings(userId);
  return aiSettings && aiSettings.enabled && aiSettings.apiKey;
};

const buildCacheKey = (searchResults, searchQuery) => {
  const ids = (searchResults || []).map(n => n.id).sort().join(',');
  return `${searchQuery || ''}|${ids}`;
};

export const generateSearchSummary = async (searchResults, searchQuery, userId) => {
  const aiSettings = await getAISettings(userId);
  if (!aiSettings || !aiSettings.enabled || !aiSettings.apiKey) {
    throw new Error('AI features are not enabled');
  }
  if (!searchResults || searchResults.length === 0) {
    return null;
  }

  const dek = window.__yotesDek;
  if (!dek) throw new Error('Encryption key not available');

  const cacheKey = buildCacheKey(searchResults, searchQuery);

  // Try cache first
  try {
    const cached = await convex.query(api.ai.getSummaryCache, { userId, cacheKey });
    if (cached?.summaryEnc?.ct && cached?.summaryEnc?.iv) {
      const json = await decryptString(dek, cached.summaryEnc);
      const parsed = JSON.parse(json);
      // Mark as cached for UI acknowledgement
      parsed._cached = true;
      return parsed;
    }
  } catch {}

  const googleProvider = createGoogleGenerativeAI({ apiKey: aiSettings.apiKey });
  const model = googleProvider('gemini-2.5-flash-lite');
  const formattedResults = searchResults.map(note => ({
    id: note.id,
    title: note.title,
    content: note.content.substring(0, 200) + (note.content.length > 200 ? '...' : ''),
    tags: note.tags || [],
    createdAt: note.createdAt
  }));

  const prompt = `You are a helpful AI summarizing search results for a notes application. Analyze these results for the query "${searchQuery}" and provide a structured summary.\n\n` +
    `Search Results: ${JSON.stringify(formattedResults)}\n\n` +
    `Return JSON only with this exact structure: {\n` +
    `  "overview": string,\n` +
    `  "themes": string[],\n` +
    `  "takeaways": string[],\n` +
    `  "suggestedTags": string[]\n` +
    `}`;

  const { object } = await generateObject({
    model,
    tools: {
      google_search: googleProvider.tools.googleSearch({}),
      url_context: googleProvider.tools.urlContext({}),
    },
    schema: z.object({
      overview: z.string(),
      themes: z.array(z.string()),
      takeaways: z.array(z.string()),
      suggestedTags: z.array(z.string()),
    }),
    prompt,
    maxRetries: 1,
  });

  // Cache encrypted
  try {
    const json = JSON.stringify(object);
    const enc = await encryptString(dek, json);
    await convex.mutation(api.ai.putSummaryCache, { userId, cacheKey, summaryEnc: enc, ttlSeconds: 60 * 10 });
  } catch {}

  return object;
};

export { getAISettings };