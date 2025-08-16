import { convex } from '../lib/convexClient.tsx';
import { api } from '../../convex/_generated/api';

const getAISettings = async (userId) => {
  try {
    const settings = await convex.query(api.ai.getSettings, userId ? { userId } : {});
    return settings;
  } catch {
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
export const generateSearchSummary = async (searchResults, searchQuery, apiKey) => {
  if (!searchResults || searchResults.length === 0) {
    return null;
  }

  try {
    const formattedResults = searchResults.map(note => ({
      id: note.id,
      title: note.title,
      content: note.content.substring(0, 200) + (note.content.length > 200 ? '...' : ''),
      tags: note.tags || [],
      createdAt: note.createdAt
    }));

    const prompt = {
      contents: [
        {
          parts: [
            {
              text: `You are a helpful AI summarizing search results for a notes application. Please analyze these search results for the query "${searchQuery}" and provide a structured summary:
              
Search Results: ${JSON.stringify(formattedResults)}

Please generate a concise summary with these sections:
1. Overview (2-3 sentences)
2. Common Themes (bullet points)
3. Key Takeaways (bullet points)
4. Suggested Tags (comma separated) 

Format your response as JSON with the following structure:
{
  "overview": "Overview text here...",
  "themes": ["Theme 1", "Theme 2", ...],
  "takeaways": ["Takeaway 1", "Takeaway 2", ...],
  "suggestedTags": ["tag1", "tag2", ...]
}
Example Response:
{
  "overview": "The search results contain a single note titled 'MCP Collection From An X Post'. This note appears to be a collection of resources, specifically related to a server designed to fetch code examples and documentation for Large Language Models (LLMs) and AI code editors.",
  "themes": ["LLMs", "Code Examples", "Documentation", "AI Code Editors", "MCP Server"],
  "takeaways": ["MCP Resources are related to a server for fetching LLM code examples.", "The resources originated from an 'X Post' (likely Twitter)."],
  "suggestedTags": ["MCP", "LLM", "Code Examples", "Documentation", "AI Code Editors", "X Post"]
}

Keep your response concise and directly relevant to the search query.
Respond with ONLY the JSON object and no additional text.`
            }
          ]
        }
      ]
    };

    const endpoint = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey
      },
      body: JSON.stringify(prompt),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`API request failed: ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();

    const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!textResponse) {
      throw new Error('Invalid response from API');
    }
    
    let jsonMatch = textResponse.match(/\{[\s\S]*\}/);
    let summary;
    
    if (jsonMatch) {
      try {
        summary = JSON.parse(jsonMatch[0]);
      } catch (err) {
        throw new Error('Failed to parse summary from API response');
      }
    } else {
      throw new Error('No valid JSON found in API response');
    }
    
    return summary;
  } catch (error) {
    console.error('Error generating AI summary:', error);
    throw error;
  }
};

export { getAISettings };