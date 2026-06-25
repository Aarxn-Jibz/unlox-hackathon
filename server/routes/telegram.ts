import { Hono } from 'hono';
import { handleTelegramWebhook } from '../controllers/telegram';
import { TelegramRepository } from '../models/telegram';
import { DocumentRepository } from '../models/documents';
import { FlashcardRepository } from '../models/flashcards';
import { askQuestion, extractTextFromPdf } from '../services/rag';
import { generateFlashcards } from '../services/flashcards';
import { matchResumeVsJD } from '../services/placement';
import { parseTimetable } from '../services/vision';
import type { Env } from '../../types';

const telegramRoutes = new Hono<{ Bindings: Env }>();

async function getUserIdByChatId(db: D1Database, chatId: string): Promise<string | null> {
  const repo = new TelegramRepository(db);
  const state = await repo.getChatState(chatId);
  return state?.userId || null;
}

telegramRoutes.post('/webhook', handleTelegramWebhook);

telegramRoutes.post('/ask', async (c) => {
  try {
    const { chatId, question, documentId } = await c.req.json().catch(() => ({}));
    if (!chatId || !question) {
      return c.json({ success: false, error: 'chatId and question are required' }, 400);
    }

    const userId = await getUserIdByChatId(c.env.DB, chatId);
    if (!userId) {
      return c.json({ success: false, error: 'Telegram account not linked.' }, 400);
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

telegramRoutes.post('/flashcards', async (c) => {
  try {
    const { chatId } = await c.req.json().catch(() => ({}));
    if (!chatId) {
      return c.json({ success: false, error: 'chatId is required' }, 400);
    }

    const userId = await getUserIdByChatId(c.env.DB, chatId);
    if (!userId) {
      return c.json({ success: false, error: 'Telegram account not linked.' }, 400);
    }

    const docRepo = new DocumentRepository(c.env.DB);
    const docs = await docRepo.findByUserId(userId);
    if (docs.length === 0) {
      return c.json({ success: false, error: 'No documents found for this user.' }, 404);
    }

    const latestDoc = docs[0];
    const cardRepo = new FlashcardRepository(c.env.DB);
    let flashcards = await cardRepo.findByDocumentId(userId, latestDoc.id);

    if (flashcards.length === 0) {
      const apiKey = c.env.GEMINI_API_KEY;
      if (!apiKey) {
        return c.json({ success: false, error: 'GEMINI_API_KEY environment variable is missing' }, 500);
      }

      const fileObj = await c.env.campusflow_bucket.get(latestDoc.r2Key);
      if (!fileObj) {
        return c.json({ success: false, error: 'File not found in storage' }, 404);
      }

      const fileBuffer = await fileObj.arrayBuffer();
      const text = await extractTextFromPdf(fileBuffer);

      const response = await generateFlashcards(apiKey, text);

      const dtos = response.flashcards.map((card) => ({
        documentId: latestDoc.id,
        front: card.question,
        back: card.answer,
      }));

      flashcards = await cardRepo.bulkCreate(userId, dtos);
    }

    return c.json(
      {
        success: true,
        flashcards,
      },
      200,
    );
  } catch (err) {
    return c.json({ success: false, error: (err as Error).message }, 500);
  }
});

telegramRoutes.post('/resume', async (c) => {
  try {
    const { chatId, resumeText, jobDescription } = await c.req.json().catch(() => ({}));
    if (!chatId || !resumeText || !jobDescription) {
      return c.json({ success: false, error: 'chatId, resumeText, and jobDescription are required' }, 400);
    }

    const userId = await getUserIdByChatId(c.env.DB, chatId);
    if (!userId) {
      return c.json({ success: false, error: 'Telegram account not linked.' }, 400);
    }

    const apiKey = c.env.GEMINI_API_KEY;
    if (!apiKey) {
      return c.json({ success: false, error: 'GEMINI_API_KEY environment variable is missing' }, 500);
    }

    const result = await matchResumeVsJD(apiKey, resumeText, jobDescription);

    return c.json(
      {
        success: true,
        analysis: {
          score: result.matchPercentage,
          matchPercentage: result.matchPercentage,
          missingKeywords: result.missingKeywords,
          improvementTips: result.improvementTips,
          feedback:
            result.improvementTips.join('\n') ||
            (result.matchPercentage > 70
              ? 'Strong resume match! Keep polishing formatting.'
              : 'Consider adding more keywords matching the job description to improve selection chance.'),
        },
      },
      200,
    );
  } catch (err) {
    return c.json({ success: false, error: (err as Error).message }, 500);
  }
});

telegramRoutes.post('/timetable', async (c) => {
  try {
    const { chatId, name, r2Key } = await c.req.json().catch(() => ({}));
    if (!chatId || !name || !r2Key) {
      return c.json({ success: false, error: 'chatId, name, and r2Key are required' }, 400);
    }

    const userId = await getUserIdByChatId(c.env.DB, chatId);
    if (!userId) {
      return c.json({ success: false, error: 'Telegram account not linked.' }, 400);
    }

    const apiKey = c.env.GEMINI_API_KEY;
    if (!apiKey) {
      return c.json({ success: false, error: 'GEMINI_API_KEY environment variable is missing' }, 500);
    }

    const fileObj = await c.env.campusflow_bucket.get(r2Key);
    if (!fileObj) {
      return c.json({ success: false, error: 'Uploaded timetable image not found in storage' }, 404);
    }

    const fileBuffer = await fileObj.arrayBuffer();
    const mimeType = fileObj.httpMetadata?.contentType || 'image/png';

    const parsed = await parseTimetable(apiKey, fileBuffer, mimeType);

    return c.json(
      {
        success: true,
        timetable: {
          id: crypto.randomUUID(),
          userId,
          r2Key,
          name,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        subjects: parsed.subjects,
      },
      200,
    );
  } catch (err) {
    return c.json({ success: false, error: (err as Error).message }, 500);
  }
});

export default telegramRoutes;
