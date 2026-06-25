import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth';

const tasksRoutes = new Hono<{ Variables: { userId: string } }>();

tasksRoutes.use('/*', authMiddleware);

tasksRoutes.get('/', (c) => {
  const userId = c.get('userId');
  return c.json(
    {
      success: true,
      userId,
      tasks: [
        {
          id: 'mock-task-1',
          title: 'Mock Task 1',
          description: 'Complete the backend implementation',
          status: 'todo',
          priority: 'high',
          dueDate: new Date().toISOString(),
        },
      ],
    },
    200,
  );
});

tasksRoutes.post('/', async (c) => {
  const userId = c.get('userId');
  const body = await c.req.json();
  return c.json(
    {
      success: true,
      task: {
        id: crypto.randomUUID(),
        userId,
        title: body.title || 'Untitled Task',
        description: body.description || '',
        status: body.status || 'todo',
        priority: body.priority || 'medium',
        dueDate: body.dueDate || null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    },
    200,
  );
});

tasksRoutes.put('/:id', async (c) => {
  const id = c.req.param('id');
  const userId = c.get('userId');
  const body = await c.req.json();
  return c.json(
    {
      success: true,
      task: {
        id,
        userId,
        title: body.title,
        description: body.description,
        status: body.status,
        priority: body.priority,
        dueDate: body.dueDate,
        updatedAt: new Date().toISOString(),
      },
    },
    200,
  );
});

tasksRoutes.delete('/:id', (c) => {
  const id = c.req.param('id');
  return c.json(
    {
      success: true,
      message: `Task ${id} deleted successfully`,
    },
    200,
  );
});

export default tasksRoutes;
