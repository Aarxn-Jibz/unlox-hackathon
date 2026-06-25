import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * Helper function to retrieve a Google Generative AI client instance.
 * Accepts the API key, typically read from Cloudflare Workers binding (c.env.GEMINI_API_KEY).
 *
 * @param apiKey - The Gemini API key.
 * @returns GoogleGenerativeAI instance.
 */
export function getGeminiClient(apiKey: string): GoogleGenerativeAI {
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is required to initialize Gemini client');
  }
  return new GoogleGenerativeAI(apiKey);
}

/**
 * Embed a single text string using Gemini text-embedding-004 model.
 * Returns a 768-dimensional vector.
 */
export async function embedContent(apiKey: string, text: string): Promise<number[]> {
  const genAI = getGeminiClient(apiKey);
  const model = genAI.getGenerativeModel({ model: 'text-embedding-004' });
  const result = await model.embedContent(text);
  return result.embedding.values;
}
