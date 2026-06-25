import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth';
import { parseTimetable } from '../services/vision';
import { BunkService } from '../services/bunk';
import type { Env } from '../../types';

const bunkRoutes = new Hono<{ Bindings: Env; Variables: { userId: string } }>();

interface TimetableSubject {
  subjectName?: string;
  attended?: number;
  total?: number;
  targetPercentage?: number;
}

bunkRoutes.use('/*', authMiddleware);

bunkRoutes.post('/parse-timetable', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const { imageBase64, mimeType } = body;

    if (!imageBase64) {
      return c.json({ success: false, error: 'imageBase64 is required' }, 400);
    }

    const buffer = Buffer.from(imageBase64, 'base64');
    const apiKey = (c.env as any)?.GEMINI_API_KEY || process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return c.json({ success: false, error: 'GEMINI_API_KEY is not configured on the server.' }, 500);
    }

    const parsed = await parseTimetable(apiKey, buffer, mimeType || 'image/png');

    return c.json({
      success: true,
      timetable: parsed.subjects
    }, 200);
  } catch (err) {
    return c.json({ success: false, error: (err as Error).message }, 500);
  }
});

bunkRoutes.post('/presigned-url', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const contentLength = body.contentLength ?? Number(c.req.query('contentLength'));

    if (contentLength === undefined || isNaN(contentLength)) {
      return c.json({ success: false, error: 'contentLength is required' }, 400);
    }

    if (contentLength > 5 * 1024 * 1024) {
      return c.json({ success: false, error: 'File size exceeds the 5MB limit.' }, 400);
    }

    const fileName = body.fileName || 'timetable.png';
    const key = `timetable/${c.get('userId')}/${Date.now()}-${fileName}`;
    const uploadUrl = `${new URL(c.req.url).origin}/api/bunk/upload?key=${encodeURIComponent(key)}`;

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

bunkRoutes.put('/upload', async (c) => {
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
        contentType: c.req.header('Content-Type') || 'image/png',
      },
    });

    return c.json({ success: true, key }, 200);
  } catch (err) {
    return c.json({ success: false, error: (err as Error).message }, 500);
  }
});

bunkRoutes.post('/timetable', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const { name, r2Key } = body;

    if (!name || !r2Key) {
      return c.json({ success: false, error: 'name and r2Key are required' }, 400);
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
          userId: c.get('userId'),
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

bunkRoutes.post('/calculate', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const { subjects } = body;

    if (!subjects || !Array.isArray(subjects)) {
      return c.json({ success: false, error: 'subjects array is required' }, 400);
    }

    const inputs = subjects.map((sub: TimetableSubject) => ({
      subjectName: sub.subjectName || 'Unknown Subject',
      attended: sub.attended || 0,
      total: sub.total || 0,
      targetPercentage: sub.targetPercentage || 75,
    }));

    const results = BunkService.analyzeRisk(inputs);

    const overallAttended = results.reduce((sum, r) => sum + r.attended, 0);
    const overallTotal = results.reduce((sum, r) => sum + r.total, 0);
    const overallPercentage =
      overallTotal > 0 ? Number(((overallAttended / overallTotal) * 100).toFixed(2)) : 0;

    const formattedResults = results.map((r) => ({
      ...r,
      percentage: Number(r.percentage.toFixed(2)),
    }));

    return c.json(
      {
        success: true,
        subjects: formattedResults,
        overallPercentage,
      },
      200,
    );
  } catch (err) {
    return c.json({ success: false, error: (err as Error).message }, 500);
  }
});

export default bunkRoutes;
