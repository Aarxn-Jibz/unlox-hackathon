import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth';
import { TaskRepository } from '../models/tasks';
import type { Env } from '../../types';

const tasksRoutes = new Hono<{ Bindings: Env; Variables: { userId: string } }>();

tasksRoutes.use('/*', authMiddleware);

tasksRoutes.get('/', async (c) => {
  try {
    const userId = c.get('userId');
    const repo = new TaskRepository(c.env.DB);
    const tasks = await repo.findByUserId(userId);
    return c.json({ success: true, tasks }, 200);
  } catch (err) {
    return c.json({ success: false, error: (err as Error).message }, 500);
  }
});

tasksRoutes.post('/', async (c) => {
  try {
    const userId = c.get('userId');
    const body = await c.req.json();
    if (!body.title) {
      return c.json({ success: false, error: 'title is required' }, 400);
    }

    const repo = new TaskRepository(c.env.DB);
    const task = await repo.create(userId, {
      title: body.title,
      description: body.description,
      dueDate: body.dueDate,
      status: body.status || 'todo',
      priority: body.priority || 'medium',
    });

    return c.json({ success: true, task }, 200);
  } catch (err) {
    return c.json({ success: false, error: (err as Error).message }, 500);
  }
});

tasksRoutes.put('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const userId = c.get('userId');
    const body = await c.req.json();

    const repo = new TaskRepository(c.env.DB);
    const success = await repo.update(userId, id, body);
    if (!success) {
      return c.json({ success: false, error: 'Task not found or update failed' }, 404);
    }

    return c.json(
      {
        success: true,
        task: {
          id,
          userId,
          ...body,
        },
      },
      200,
    );
  } catch (err) {
    return c.json({ success: false, error: (err as Error).message }, 500);
  }
});

tasksRoutes.delete('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const userId = c.get('userId');

    const repo = new TaskRepository(c.env.DB);
    const success = await repo.delete(userId, id);
    if (!success) {
      return c.json({ success: false, error: 'Task not found or deletion failed' }, 404);
    }

    return c.json({ success: true, message: `Task ${id} deleted successfully` }, 200);
  } catch (err) {
    return c.json({ success: false, error: (err as Error).message }, 500);
  }
});

export default tasksRoutes;
