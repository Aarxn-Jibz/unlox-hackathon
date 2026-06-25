import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth';
import { askQuestion, extractTextFromPdf, processPdfDocument } from '../services/rag';
import { generateFlashcards } from '../services/flashcards';
import { DocumentRepository } from '../models/documents';
import { FlashcardRepository } from '../models/flashcards';
import type { Env } from '../../types';

const studyRoutes = new Hono<{ Bindings: Env; Variables: { userId: string } }>();

studyRoutes.use('/*', authMiddleware);

studyRoutes.post('/presigned-url', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const contentLength = body.contentLength ?? Number(c.req.query('contentLength'));

    if (contentLength === undefined || isNaN(contentLength)) {
      return c.json({ success: false, error: 'contentLength is required' }, 400);
    }

    if (contentLength > 5 * 1024 * 1024) {
      return c.json({ success: false, error: 'File size exceeds the 5MB limit.' }, 400);
    }

    const fileName = body.fileName || 'document.pdf';
    const key = `study/${c.get('userId')}/${Date.now()}-${fileName}`;
    const uploadUrl = `${new URL(c.req.url).origin}/api/study/upload?key=${encodeURIComponent(key)}`;

    return c.json(
      {
        success: true,
        uploadUrl,
        key,
      },
      200,
    );
  } catch (err) {
    return c.json({ success: false, error: (err as Error).message }, 500);
  }
});

studyRoutes.put('/upload', async (c) => {
  try {
    const key = c.req.query('key');
    if (!key) {
      return c.json({ success: false, error: 'key is required' }, 400);
    }

    const body = await c.req.arrayBuffer();
    if (!body || body.byteLength === 0) {
      return c.json({ success: false, error: 'File content is empty' }, 400);
    }

    await c.env.campusflow_bucket.put(key, body, {
      httpMetadata: {
        contentType: c.req.header('Content-Type') || 'application/pdf',
      },
    });

    return c.json({ success: true, key }, 200);
  } catch (err) {
    return c.json({ success: false, error: (err as Error).message }, 500);
  }
});

studyRoutes.post('/document', async (c) => {
  try {
    const userId = c.get('userId');
    const body = await c.req.json().catch(() => ({}));
    const { name, r2Key, fileSize, mimeType } = body;

    if (!name || !r2Key || fileSize === undefined) {
      return c.json({ success: false, error: 'name, r2Key, and fileSize are required' }, 400);
    }

    if (fileSize > 5 * 1024 * 1024) {
      return c.json({ success: false, error: 'File size exceeds the 5MB limit.' }, 400);
    }

    const docRepo = new DocumentRepository(c.env.DB);
    const doc = await docRepo.create(userId, { r2Key, name, fileSize, mimeType: mimeType || 'application/pdf' });

    const fileObj = await c.env.campusflow_bucket.get(r2Key);
    if (!fileObj) {
      return c.json({ success: false, error: 'Uploaded file not found in R2' }, 404);
    }

    const fileBuffer = await fileObj.arrayBuffer();

    const apiKey = c.env.GEMINI_API_KEY;
    if (!apiKey) {
      return c.json({ success: false, error: 'GEMINI_API_KEY environment variable is missing' }, 500);
    }

    await processPdfDocument(apiKey, fileBuffer, doc.id, c.env.VECTORIZE);

    return c.json(
      {
        success: true,
        document: doc,
      },
      200,
    );
  } catch (err) {
    return c.json({ success: false, error: (err as Error).message }, 500);
  }
});

studyRoutes.get('/documents', async (c) => {
  try {
    const userId = c.get('userId');
    const docRepo = new DocumentRepository(c.env.DB);
    const documents = await docRepo.findByUserId(userId);
    return c.json({ success: true, documents }, 200);
  } catch (err) {
    return c.json({ success: false, error: (err as Error).message }, 500);
  }
});

studyRoutes.post('/ask', async (c) => {
  try {
    const { question, documentId } = await c.req.json().catch(() => ({}));
    if (!question) {
      return c.json({ success: false, error: 'question is required' }, 400);
    }

    const apiKey = c.env.GEMINI_API_KEY;
    if (!apiKey) {
      return c.json({ success: false, error: 'GEMINI_API_KEY environment variable is missing' }, 500);
    }

    const vectorize = c.env.VECTORIZE;
    if (!vectorize) {
      return c.json({ success: false, error: 'VECTORIZE binding is missing' }, 500);
    }

    const result = await askQuestion(apiKey, question, documentId, vectorize);

    return c.json(
      {
        success: true,
        answer: result.answer,
        sources: result.sources,
      },
      200,
    );
  } catch (err) {
    return c.json({ success: false, error: (err as Error).message }, 500);
  }
});

studyRoutes.get('/flashcards', async (c) => {
  try {
    const userId = c.get('userId');
    const cardRepo = new FlashcardRepository(c.env.DB);
    const flashcards = await cardRepo.findByUserId(userId);
    return c.json({ success: true, flashcards }, 200);
  } catch (err) {
    return c.json({ success: false, error: (err as Error).message }, 500);
  }
});

studyRoutes.post('/flashcards/generate', async (c) => {
  try {
    const userId = c.get('userId');
    const { documentId, notesText } = await c.req.json().catch(() => ({}));

    const apiKey = c.env.GEMINI_API_KEY;
    if (!apiKey) {
      return c.json({ success: false, error: 'GEMINI_API_KEY environment variable is missing' }, 500);
    }

    let textToProcess = '';

    if (documentId) {
      const docRepo = new DocumentRepository(c.env.DB);
      const doc = await docRepo.findById(documentId, userId);
      if (!doc) {
        return c.json({ success: false, error: 'Document not found' }, 404);
      }

      const fileObj = await c.env.campusflow_bucket.get(doc.r2Key);
      if (!fileObj) {
        return c.json({ success: false, error: 'File not found in storage' }, 404);
      }

      const fileBuffer = await fileObj.arrayBuffer();
      textToProcess = await extractTextFromPdf(fileBuffer);
    } else if (notesText) {
      textToProcess = notesText;
    } else {
      return c.json({ success: false, error: 'Either documentId or notesText is required' }, 400);
    }

    if (!textToProcess || !textToProcess.trim()) {
      return c.json({ success: false, error: 'No text content available to generate flashcards' }, 400);
    }

    const response = await generateFlashcards(apiKey, textToProcess);

    const cardRepo = new FlashcardRepository(c.env.DB);
    const dtos = response.flashcards.map((card) => ({
      documentId: documentId || undefined,
      front: card.question,
      back: card.answer,
    }));

    const savedCards = await cardRepo.bulkCreate(userId, dtos);

    return c.json(
      {
        success: true,
        flashcards: savedCards,
      },
      200,
    );
  } catch (err) {
    return c.json({ success: false, error: (err as Error).message }, 500);
  }
});

export default studyRoutes;
