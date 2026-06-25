import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth';

const automationsRoutes = new Hono<{ Variables: { userId: string } }>();

automationsRoutes.use('/*', authMiddleware);

automationsRoutes.get('/logs', (c) => {
  return c.json(
    {
      success: true,
      logs: [
        {
          id: 'mock-log-1',
          userId: c.get('userId'),
          integrationType: 'calendar',
          status: 'success',
          details: 'Successfully synced 3 deadlines to Google Calendar',
          createdAt: new Date(Date.now() - 3600000).toISOString(),
        },
        {
          id: 'mock-log-2',
          userId: c.get('userId'),
          integrationType: 'telegram',
          status: 'success',
          details: 'Broadcast notice to channel @campus_flow_alerts',
          createdAt: new Date(Date.now() - 7200000).toISOString(),
        },
      ],
    },
    200,
  );
});

export default automationsRoutes;
