import type { MiddlewareHandler } from 'hono';
import { verify } from 'hono/jwt';

export const authMiddleware: MiddlewareHandler = async (c, next) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ success: false, error: 'Unauthorized: Missing or invalid token' }, 401);
  }

  const token = authHeader.substring(7);
  try {
    const secret = c.env.JWT_SECRET || 'campusflow-secret-key-12345';
    const payload = await verify(token, secret, 'HS256');
    if (!payload || !payload.id) {
      return c.json({ success: false, error: 'Unauthorized: Invalid token payload' }, 401);
    }
    c.set('userId', payload.id);
    await next();
  } catch {
    return c.json({ success: false, error: 'Unauthorized: Invalid or expired token' }, 401);
  }
};
