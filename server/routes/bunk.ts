import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth';
import { parseTimetable } from '../services/vision';

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

bunkRoutes.post('/timetable', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const { name, r2Key } = body;

    if (!name || !r2Key) {
      return c.json({ success: false, error: 'name and r2Key are required' }, 400);
    }

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

    const results = subjects.map((sub: TimetableSubject) => {
      const target = sub.targetPercentage || 75;
      const attended = sub.attended || 0;
      const total = sub.total || 0;

      const currentPct = total > 0 ? (attended / total) * 100 : 0;

      let bunksPossible = 0;
      let classesToAttend = 0;

      if (currentPct >= target) {
        bunksPossible = Math.floor((attended * 100) / target - total);
        if (bunksPossible < 0) bunksPossible = 0;
      } else {
        if (target < 100) {
          classesToAttend = Math.ceil((target * total - 100 * attended) / (100 - target));
        } else {
          classesToAttend = 999;
        }
        if (classesToAttend < 0) classesToAttend = 0;
      }

      return {
        subjectName: sub.subjectName || 'Unknown Subject',
        attended,
        total,
        targetPercentage: target,
        percentage: Number(currentPct.toFixed(2)),
        bunksPossible,
        classesToAttend,
      };
    });

    const overallAttended = results.reduce((sum, r) => sum + r.attended, 0);
    const overallTotal = results.reduce((sum, r) => sum + r.total, 0);
    const overallPercentage =
      overallTotal > 0 ? Number(((overallAttended / overallTotal) * 100).toFixed(2)) : 0;

    return c.json(
      {
        success: true,
        subjects: results,
        overallPercentage,
      },
      200,
    );
  } catch (err) {
    return c.json({ success: false, error: (err as Error).message }, 500);
  }
});

export default bunkRoutes;
