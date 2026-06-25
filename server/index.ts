import { Hono } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import { cors } from 'hono/cors';
import type { Env } from '../types';
import authRouter from './routes/auth';
import academicRouter from './routes/academic';

// Import standardized mock routes (collator-implemented features)
import tasksRoutes from './routes/tasks';
import studyRoutes from './routes/study';
import bunkRoutes from './routes/bunk';
import placementRoutes from './routes/placement';
import noticesRoutes from './routes/notices';
import automationsRoutes from './routes/automations';
import telegramRoutes from './routes/telegram';

const baseApp = new Hono<{ Bindings: Env }>();

// Enable secure dynamic CORS based on environment configuration
baseApp.use('/*', async (c, next) => {
  const allowed = c.env?.ALLOWED_ORIGINS;
  const corsMiddleware = cors({
    origin: (origin) => {
      if (!allowed || allowed === '*') {
        return origin || '*';
      }
      const origins = allowed.split(',').map((o: string) => o.trim());
      if (origin && origins.includes(origin)) {
        return origin;
      }
      return origins[0] || 'http://localhost:5173';
    },
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
  });
  return corsMiddleware(c, next);
});

// Global Error Handler
baseApp.onError((err, c) => {
  console.error('Runtime Error:', err);
  const status = 'status' in err ? (err.status as ContentfulStatusCode) : 500;
  return c.json({ success: false, error: err.message }, status);
});

// Chain all routes to preserve their type information for Hono RPC
const app = baseApp
  .route('/', authRouter)
  .route('/api/academic', academicRouter)
  .route('/api/tasks', tasksRoutes)
  .route('/api/study', studyRoutes)
  .route('/api/bunk', bunkRoutes)
  .route('/api/placement', placementRoutes)
  .route('/api/notices', noticesRoutes)
  .route('/api/automations', automationsRoutes)
  .route('/telegram', telegramRoutes);

// Health check endpoint
app.get('/health', (c) => c.json({ status: 'ok', runtime: 'bun', time: new Date().toISOString() }));

export type AppType = typeof app;

export default {
  port: process.env.PORT || 3001,
  fetch: app.fetch,
};
