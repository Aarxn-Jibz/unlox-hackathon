import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth';

const studyRoutes = new Hono<{ Variables: { userId: string } }>();

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
    const mockUrl = `https://mock-r2-bucket.r2.cloudflarestorage.com/${key}?signature=mock-signature-12345`;

    return c.json(
      {
        success: true,
        uploadUrl: mockUrl,
        key,
      },
      200,
    );
  } catch (err) {
    return c.json({ success: false, error: (err as Error).message }, 500);
  }
});

studyRoutes.post('/document', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const { name, r2Key, fileSize, mimeType } = body;

    if (!name || !r2Key || fileSize === undefined) {
      return c.json({ success: false, error: 'name, r2Key, and fileSize are required' }, 400);
    }

    if (fileSize > 5 * 1024 * 1024) {
      return c.json({ success: false, error: 'File size exceeds the 5MB limit.' }, 400);
    }

    return c.json(
      {
        success: true,
        document: {
          id: crypto.randomUUID(),
          userId: c.get('userId'),
          r2Key,
          name,
          fileSize,
          mimeType: mimeType || 'application/octet-stream',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      },
      200,
    );
  } catch (err) {
    return c.json({ success: false, error: (err as Error).message }, 500);
  }
});

studyRoutes.get('/documents', (c) => {
  return c.json(
    {
      success: true,
      documents: [
        {
          id: 'mock-doc-1',
          userId: c.get('userId'),
          r2Key: 'study/mock-doc-1.pdf',
          name: 'Syllabus.pdf',
          fileSize: 1024 * 1024 * 2,
          mimeType: 'application/pdf',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
    },
    200,
  );
});

studyRoutes.post('/ask', async (c) => {
  try {
    const { question, documentId } = await c.req.json().catch(() => ({}));
    if (!question) {
      return c.json({ success: false, error: 'question is required' }, 400);
    }
    return c.json(
      {
        success: true,
        answer: `This is a mock response to your question: "${question}". Vector search was successfully queried.`,
        sources: documentId ? [documentId] : ['mock-doc-1'],
      },
      200,
    );
  } catch (err) {
    return c.json({ success: false, error: (err as Error).message }, 500);
  }
});

studyRoutes.get('/flashcards', (c) => {
  return c.json(
    {
      success: true,
      flashcards: [
        {
          id: 'mock-card-1',
          userId: c.get('userId'),
          documentId: 'mock-doc-1',
          front: 'What is Cloudflare R2?',
          back: 'R2 is a Cloudflare-hosted object storage service with zero egress fees.',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
    },
    200,
  );
});

export default studyRoutes;
