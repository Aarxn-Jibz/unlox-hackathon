import { Hono } from 'hono';
import { jwt } from 'hono/jwt';
import { handleSignup, handleLogin, handleOnboarding } from '../controllers/auth';
import type { Env } from '../../types';

const authRouter = new Hono<{ Bindings: Env }>();

// Public endpoints
authRouter.post('/signup', handleSignup);
authRouter.post('/login', handleLogin);

// Protected onboarding endpoint
authRouter.put(
  '/onboard',
  async (c, next) => {
    const secret = c.env.JWT_SECRET || 'campusflow-secret-key-12345';
    const handler = jwt({ secret, alg: 'HS256' });
    return handler(c, next);
  },
  handleOnboarding,
);

export default authRouter;
