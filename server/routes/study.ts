import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth';
import {
  createDocument,
  updateDocumentText,
  getDocumentsByUserId,
  getDocumentById,
  createFlashcardsBulk,
  getFlashcardsByDocumentId,
} from '../models/study';
import {
  extractTextFromPDF,
  chunkText,
  embedText,
  embedTexts,
  storeVectors,
  searchSimilarChunks,
  generateAnswer,
  generateFlashcardsFromText,
} from '../services/study';
import type { Env } from '../../types';

const studyRoutes = new Hono<{ Bindings: Env; Variables: { userId: string } }>();

studyRoutes.use('/*', authMiddleware);

studyRoutes.post('/upload', async (c) => {
  try {
    const userId = c.get('userId');
    const db = c.env.DB;
    const apiKey = c.env.GEMINI_API_KEY;
    const vectorize = c.env.VECTORIZE;

    if (!apiKey) {
      return c.json({ success: false, error: 'GEMINI_API_KEY is not configured' }, 500);
    }

    const body = await c.req.json().catch(() => ({}));
    const { fileBase64, fileName, mimeType } = body;

    if (!fileBase64) {
      return c.json({ success: false, error: 'fileBase64 is required' }, 400);
    }

    const fileSize = Math.round((fileBase64.length * 3) / 4);

    if (fileSize > 10 * 1024 * 1024) {
      return c.json({ success: false, error: 'File size exceeds 10MB limit' }, 400);
    }

    const doc = await createDocument(
      db, userId, fileName || 'document.pdf',
      fileSize, mimeType || 'application/pdf',
    );

    const extractedText = await extractTextFromPDF(apiKey, fileBase64);
    const chunks = chunkText(extractedText);

    if (chunks.length === 0) {
      return c.json({ success: false, error: 'No text could be extracted from the PDF' }, 400);
    }

    const embeddings = await embedTexts(apiKey, chunks);
    const inserted = await storeVectors(vectorize, doc.id, chunks, embeddings);

    await updateDocumentText(db, doc.id, extractedText, inserted);

    return c.json({
      success: true,
      document: { id: doc.id, name: doc.name, fileSize: doc.fileSize, chunkCount: inserted },
    }, 201);
  } catch (err) {
    console.error('Document upload error:', err);
    return c.json({ success: false, error: (err as Error).message }, 500);
  }
});

studyRoutes.post('/ask', async (c) => {
  try {
    const userId = c.get('userId');
    const db = c.env.DB;
    const apiKey = c.env.GEMINI_API_KEY;
    const vectorize = c.env.VECTORIZE;

    if (!apiKey) {
      return c.json({ success: false, error: 'GEMINI_API_KEY is not configured' }, 500);
    }

    const body = await c.req.json().catch(() => ({}));
    const { question, documentId } = body;

    if (!question) {
      return c.json({ success: false, error: 'question is required' }, 400);
    }

    const queryEmbedding = await embedText(apiKey, question);

    const topK = 8;
    let matches = await searchSimilarChunks(vectorize, queryEmbedding, topK);

    if (documentId) {
      const doc = await getDocumentById(db, documentId, userId);
      if (!doc) {
        return c.json({ success: false, error: 'Document not found' }, 404);
      }
      matches = matches.filter((m) => m.documentId === documentId).slice(0, topK);
    }

    if (matches.length === 0) {
      const noDataMessage = documentId
        ? 'No relevant content found in the selected document for your question.'
        : 'No relevant content found. Upload a document first.';
      return c.json({ success: true, answer: noDataMessage, sources: [] });
    }

    const answer = await generateAnswer(apiKey, question, matches);
    const sourceIds = [...new Set(matches.map((m) => m.documentId))];

    return c.json({ success: true, answer, sources: sourceIds });
  } catch (err) {
    console.error('Ask error:', err);
    return c.json({ success: false, error: (err as Error).message }, 500);
  }
});

studyRoutes.post('/flashcards/generate', async (c) => {
  try {
    const userId = c.get('userId');
    const db = c.env.DB;
    const apiKey = c.env.GEMINI_API_KEY;

    if (!apiKey) {
      return c.json({ success: false, error: 'GEMINI_API_KEY is not configured' }, 500);
    }

    const body = await c.req.json().catch(() => ({}));
    const { documentId } = body;

    if (!documentId) {
      return c.json({ success: false, error: 'documentId is required' }, 400);
    }

    const doc = await getDocumentById(db, documentId, userId);
    if (!doc || !doc.extracted_text) {
      return c.json({ success: false, error: 'Document not found or no text extracted' }, 404);
    }

    const cards = await generateFlashcardsFromText(apiKey, doc.extracted_text);
    const saved = await createFlashcardsBulk(db, userId, documentId, cards);

    return c.json({ success: true, flashcards: saved }, 201);
  } catch (err) {
    console.error('Flashcard generation error:', err);
    return c.json({ success: false, error: (err as Error).message }, 500);
  }
});

studyRoutes.get('/flashcards', async (c) => {
  try {
    const userId = c.get('userId');
    const db = c.env.DB;
    const documentId = c.req.query('documentId');

    const flashcards = documentId
      ? await getFlashcardsByDocumentId(db, documentId, userId)
      : [];

    return c.json({ success: true, flashcards });
  } catch (err) {
    console.error('Flashcard fetch error:', err);
    return c.json({ success: false, error: (err as Error).message }, 500);
  }
});

studyRoutes.get('/documents', async (c) => {
  try {
    const userId = c.get('userId');
    const db = c.env.DB;
    const documents = await getDocumentsByUserId(db, userId);
    return c.json({ success: true, documents });
  } catch (err) {
    console.error('Documents fetch error:', err);
    return c.json({ success: false, error: (err as Error).message }, 500);
  }
});

export default studyRoutes;
