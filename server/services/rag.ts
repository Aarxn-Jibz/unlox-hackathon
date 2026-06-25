import { getGeminiClient } from '../lib/gemini-client';
import { chunkText } from '../lib/chunker';
import { upsertVectors, queryVectors } from '../lib/vectorize';
import type { VectorInput } from '../lib/vectorize';
import type { GoogleGenerativeAI } from '@google/generative-ai';

// Client caching to avoid repeated instantiations of the GoogleGenerativeAI client
let cachedGenAI: GoogleGenerativeAI | null = null;
let cachedApiKey: string | null = null;

function getCachedClient(apiKey: string): GoogleGenerativeAI {
  if (cachedGenAI && cachedApiKey === apiKey) {
    return cachedGenAI;
  }
  const client = getGeminiClient(apiKey);
  cachedGenAI = client;
  cachedApiKey = apiKey;
  return client;
}

export interface RAGAnswerResponse {
  answer: string;
  sources: string[];
}

/**
 * Parses text from a PDF file buffer using the 'pdf-parse' library.
 * If the dependency is missing, throws a clear descriptive error.
 *
 * @param fileBuffer - The PDF file binary buffer.
 * @returns The extracted text content.
 */
async function extractTextFromPdf(fileBuffer: ArrayBuffer | Buffer): Promise<string> {
  const nodeBuffer = Buffer.isBuffer(fileBuffer)
    ? fileBuffer
    : Buffer.from(fileBuffer as ArrayBuffer);
  try {
    // Dynamic import using a variable to bypass TypeScript static resolution when pdf-parse is uninstalled
    const moduleName = 'pdf-parse';
    const pdfParse = (await import(moduleName)).default;
    const data = await pdfParse(nodeBuffer);
    return data.text || '';
  } catch (error) {
    throw new Error(
      `PDF parsing failed: The 'pdf-parse' package is missing or could not be loaded. ` +
        `Please ensure 'pdf-parse' and '@types/pdf-parse' are installed. ` +
        `Command: npm install pdf-parse && npm install --save-dev @types/pdf-parse. ` +
        `Detail: ${(error as Error)?.message || error}`,
    );
  }
}

/**
 * Processes a PDF document: extracts text, chunks it, generates embeddings,
 * and upserts the vectors to the Vectorize index.
 *
 * @param apiKey - The Gemini API key.
 * @param fileBuffer - The PDF file buffer.
 * @param documentId - Unique identifier for the document.
 * @param vectorIndex - The Vectorize index binding.
 */
export async function processPdfDocument(
  apiKey: string,
  fileBuffer: ArrayBuffer | Buffer,
  documentId: string,
  vectorIndex: VectorizeIndex,
): Promise<void> {
  if (!apiKey) {
    throw new TypeError('GEMINI_API_KEY is required to initialize the Gemini client');
  }
  if (
    !fileBuffer ||
    (fileBuffer instanceof ArrayBuffer ? fileBuffer.byteLength : fileBuffer.length) === 0
  ) {
    throw new TypeError('PDF file buffer cannot be empty');
  }
  if (!documentId || !documentId.trim()) {
    throw new TypeError('documentId must be a valid non-empty string');
  }
  if (!vectorIndex) {
    throw new TypeError('Vectorize index binding (vectorIndex) is missing or undefined');
  }

  // 1. Extract text from PDF
  const extractedText = await extractTextFromPdf(fileBuffer);
  if (!extractedText || !extractedText.trim()) {
    throw new Error(
      `Failed to process document '${documentId}': No text content could be extracted from the PDF.`,
    );
  }

  // 2. chunkText()
  const chunks = chunkText(extractedText, 1024, 200);
  if (chunks.length === 0) {
    throw new Error(
      `Failed to process document '${documentId}': Extracted text chunking resulted in 0 chunks.`,
    );
  }

  // 3. Gemini Embeddings
  const genAI = getCachedClient(apiKey);
  const embeddingModel = genAI.getGenerativeModel({ model: 'text-embedding-004' });

  const vectorInputs: VectorInput[] = [];
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i].trim();
    if (!chunk) continue;

    const embedResult = await embeddingModel.embedContent(chunk);
    if (!embedResult.embedding?.values) {
      throw new Error(
        `Failed to generate embedding for chunk index ${i} in document '${documentId}'`,
      );
    }

    vectorInputs.push({
      id: `${documentId}_chunk_${i}`,
      values: embedResult.embedding.values,
      metadata: {
        documentId,
        chunkIndex: i,
        text: chunk,
      },
    });
  }

  if (vectorInputs.length === 0) {
    throw new Error(
      `Failed to process document '${documentId}': No valid text embeddings could be generated from the chunks.`,
    );
  }

  // 4. upsertVectors()
  await upsertVectors(vectorInputs, vectorIndex);
}

/**
 * Asks a question against the vector index: embeds the query, searches Vectorize,
 * builds a context prompt, and calls Gemini Flash.
 *
 * @param apiKey - The Gemini API key.
 * @param query - The user's question.
 * @param documentId - Optional document ID to filter relevant chunks.
 * @param vectorIndex - The Vectorize index binding.
 * @returns Structured answer and sources.
 */
export async function askQuestion(
  apiKey: string,
  query: string,
  documentId: string | undefined,
  vectorIndex: VectorizeIndex,
): Promise<RAGAnswerResponse> {
  if (!apiKey) {
    throw new TypeError('GEMINI_API_KEY is required to initialize the Gemini client');
  }
  if (!query || !query.trim()) {
    throw new TypeError('Query question cannot be empty or blank');
  }
  if (!vectorIndex) {
    throw new TypeError('Vectorize index binding (vectorIndex) is missing or undefined');
  }

  // 1. Generate query embedding
  const genAI = getCachedClient(apiKey);
  const embeddingModel = genAI.getGenerativeModel({ model: 'text-embedding-004' });
  const embedResult = await embeddingModel.embedContent(query.trim());

  if (!embedResult.embedding?.values) {
    throw new Error('Failed to generate embedding for the question query.');
  }

  // 2. queryVectors()
  const topK = 5;
  const matchesResult = await queryVectors(embedResult.embedding.values, topK, vectorIndex);
  const matches = matchesResult.matches || [];

  // Filter and extract relevant chunks
  const relevantChunks: string[] = [];
  const sourcesSet = new Set<string>();

  for (const match of matches) {
    if (match.metadata && typeof match.metadata.text === 'string') {
      const matchDocId = String(match.metadata.documentId || '');
      // If a specific documentId is requested, filter strictly by it
      if (!documentId || matchDocId === documentId) {
        relevantChunks.push(match.metadata.text);
        if (matchDocId) {
          sourcesSet.add(matchDocId);
        }
      }
    }
  }

  if (relevantChunks.length === 0) {
    return {
      answer: 'I cannot find the answer in the provided document.',
      sources: [],
    };
  }

  // 3. Call Gemini Flash with a safe, precise Q&A prompt
  const flashModel = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
  const context = relevantChunks.join('\n\n---\n\n');
  const promptText = `
You are a highly precise Q&A assistant. Your task is to answer the user's question based ONLY on the supplied document context.

Strict Rules:
1. Answer the question using ONLY the provided document context.
2. Do NOT use any outside knowledge or assumptions.
3. Do NOT fabricate or extrapolate information.
4. If the answer cannot be found in the retrieved context, clearly and concisely state: "I cannot find the answer in the provided document."
5. Keep your answer highly concise, direct, and focused.

Retrieved Document Context:
${context}

User Question:
${query}

Answer:
`;

  const responseResult = await flashModel.generateContent(promptText);
  const answer = responseResult.response.text();

  return {
    answer: answer || 'No answer generated.',
    sources: Array.from(sourcesSet),
  };
}
