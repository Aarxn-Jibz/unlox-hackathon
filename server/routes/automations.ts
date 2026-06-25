import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth';
import { AutomationRepository } from '../models/automations';
import type { Env } from '../../types';

const automationsRoutes = new Hono<{ Bindings: Env; Variables: { userId: string } }>();

automationsRoutes.use('/*', authMiddleware);

automationsRoutes.get('/logs', async (c) => {
  try {
    const userId = c.get('userId');
    const repo = new AutomationRepository(c.env.DB);
    const logs = await repo.findByUserId(userId);
    return c.json({ success: true, logs }, 200);
  } catch (err) {
    return c.json({ success: false, error: (err as Error).message }, 500);
  }
});

export default automationsRoutes;
