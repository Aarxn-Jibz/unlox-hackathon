import { getGeminiClient, embedContent } from '../lib/gemini-client';
import { FLASHCARD_PROMPT } from '../lib/prompts';

export const CHUNK_SIZE = 1500;
export const CHUNK_OVERLAP = 200;

export function chunkText(text: string): string[] {
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    let end = start + CHUNK_SIZE;
    if (end < text.length) {
      const boundary = text.lastIndexOf('\n', end);
      if (boundary > start + CHUNK_SIZE / 2) {
        end = boundary;
      } else {
        const spaceBoundary = text.lastIndexOf(' ', end);
        if (spaceBoundary > start + CHUNK_SIZE / 2) {
          end = spaceBoundary;
        }
      }
    } else {
      end = text.length;
    }
    chunks.push(text.slice(start, end).trim());
    start = end - CHUNK_OVERLAP;
    if (start >= text.length) break;
  }
  return chunks.filter((c) => c.length > 50);
}

export async function extractTextFromPDF(apiKey: string, pdfBase64: string): Promise<string> {
  const genAI = getGeminiClient(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
  const result = await model.generateContent([
    'Extract and return ALL text content from this PDF document verbatim. Preserve paragraphs, headings, and structure. Return ONLY the extracted text, no explanation.',
    { inlineData: { data: pdfBase64, mimeType: 'application/pdf' } },
  ]);
  return result.response.text();
}

export async function embedText(apiKey: string, text: string): Promise<number[]> {
  return embedContent(apiKey, text);
}

export async function embedTexts(apiKey: string, texts: string[]): Promise<number[][]> {
  const validTexts = texts.map((t) => t || '');
  const genAI = getGeminiClient(apiKey);
  const model = genAI.getGenerativeModel({ model: 'text-embedding-004' });
  const result = await model.batchEmbedContents({
    requests: validTexts.map((t) => ({
      content: { role: 'user', parts: [{ text: t }] },
    })),
  });
  return result.embeddings.map((e) => e.values);
}

export async function storeVectors(
  vectorize: VectorizeIndex,
  documentId: string,
  chunks: string[],
  embeddings: number[][],
): Promise<number> {
  const vectors = chunks.map((text, i) => ({
    id: `${documentId}-chunk-${i}`,
    values: embeddings[i],
    metadata: { documentId, text, chunkIndex: i },
  }));
  const inserted = await vectorize.insert(vectors);
  return inserted.count ?? chunks.length;
}

export async function searchSimilarChunks(
  vectorize: VectorizeIndex,
  queryEmbedding: number[],
  topK = 5,
): Promise<{ text: string; score: number; documentId: string }[]> {
  const result = await vectorize.query(queryEmbedding, {
    topK,
    returnMetadata: true,
    returnValues: false,
  });
  return result.matches.map((m) => ({
    text: (m.metadata as any)?.text as string || '',
    score: m.score,
    documentId: (m.metadata as any)?.documentId as string || '',
  }));
}

export async function generateAnswer(
  apiKey: string,
  question: string,
  chunks: { text: string; score: number }[],
): Promise<string> {
  const context = chunks
    .filter((c) => c.text.length > 0)
    .map((c) => c.text)
    .join('\n\n---\n\n');
  const genAI = getGeminiClient(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
  const prompt = `You are a study assistant. Answer the question based ONLY on the provided context from the user's document. If the context does not contain enough information, say so clearly. Cite specific parts when possible.

Context:
${context}

Question: ${question}

Answer:`;
  const result = await model.generateContent(prompt);
  return result.response.text();
}

export async function generateFlashcardsFromText(
  apiKey: string,
  text: string,
): Promise<{ front: string; back: string }[]> {
  const genAI = getGeminiClient(apiKey);
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: {
      responseMimeType: 'application/json',
    },
  });
  const truncated = text.length > 30000 ? text.slice(0, 30000) : text;
  const prompt = FLASHCARD_PROMPT.replace('{text}', truncated);
  const result = await model.generateContent(prompt);
  const raw = result.response.text();
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed.flashcards)) {
    throw new Error('Invalid flashcard response from Gemini');
  }
  return parsed.flashcards.map((c: any) => ({
    front: c.question || c.front || '',
    back: c.answer || c.back || '',
  }));
}
