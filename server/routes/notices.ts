import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth';

const noticesRoutes = new Hono();

noticesRoutes.use('/*', authMiddleware);

noticesRoutes.post('/broadcast', async (c) => {
  try {
    const { title, content, date } = await c.req.json().catch(() => ({}));
    if (!title || !content) {
      return c.json({ success: false, error: 'title and content are required' }, 400);
    }

    return c.json(
      {
        success: true,
        broadcast: {
          id: crypto.randomUUID(),
          title,
          summary: `Mock summary of notice: "${title}". Content processed: ${content.substring(0, 100)}...`,
          actionItems: [
            'Read full document',
            'Verify event timing',
            'Submit details to administration',
          ],
          keyDates: [
            {
              event: 'Submission Deadline',
              date: date || new Date(Date.now() + 86400000 * 3).toISOString(), // 3 days from now
            },
          ],
          urgency: 'medium',
          broadcastedAt: new Date().toISOString(),
        },
      },
      200,
    );
  } catch (err) {
    return c.json({ success: false, error: (err as Error).message }, 500);
  }
});

export default noticesRoutes;
