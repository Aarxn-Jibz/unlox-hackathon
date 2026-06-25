import type { Context } from 'hono';
import { sign } from 'hono/jwt';
import { getUserByEmail, createUser, mapToUserProfile, updateUserOnboarding } from '../models/user';
import type { LoginRequest, SignupRequest, UserOnboarding } from '../../types';
import { hashPassword, verifyPassword } from '../lib/crypto';

export async function handleSignup(c: Context) {
  try {
    const db = c.env.DB as D1Database;
    const body: SignupRequest = await c.req.json();

    if (!body.email || !body.password || !body.name) {
      return c.json({ error: 'Email, password, and name are required' }, 400);
    }

    const existingUser = await getUserByEmail(db, body.email);
    if (existingUser) {
      return c.json({ error: 'User with this email already exists' }, 400);
    }

    // Secure password hashing with Web Crypto PBKDF2 helper
    const passwordHash = await hashPassword(body.password);

    const userId = crypto.randomUUID();
    const userProfile = await createUser(db, userId, body.email, passwordHash, body.name);

    // Generate JWT Token
    const token = await sign(
      {
        id: userProfile.id,
        email: userProfile.email,
        exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24, // 24 Hours
      },
      c.env.JWT_SECRET || 'campusflow-secret-key-12345',
    );

    return c.json(
      {
        token,
        user: userProfile,
      },
      201,
    );
  } catch (error) {
    return c.json({ error: (error as Error).message || 'Internal Server Error' }, 500);
  }
}

export async function handleLogin(c: Context) {
  try {
    const db = c.env.DB as D1Database;
    const body: LoginRequest = await c.req.json();

    if (!body.email || !body.password) {
      return c.json({ error: 'Email and password are required' }, 400);
    }

    const dbUser = await getUserByEmail(db, body.email);
    if (!dbUser) {
      return c.json({ error: 'Invalid email or password' }, 401);
    }

    // Secure password verification with Web Crypto PBKDF2 helper
    const isPasswordCorrect = await verifyPassword(body.password, dbUser.password_hash);
    if (!isPasswordCorrect) {
      return c.json({ error: 'Invalid email or password' }, 401);
    }

    const userProfile = mapToUserProfile(dbUser);

    // Generate JWT Token
    const token = await sign(
      {
        id: userProfile.id,
        email: userProfile.email,
        exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24, // 24 Hours
      },
      c.env.JWT_SECRET || 'campusflow-secret-key-12345',
    );

    return c.json({
      token,
      user: userProfile,
    });
  } catch (error) {
    return c.json({ error: (error as Error).message || 'Internal Server Error' }, 500);
  }
}

export async function handleOnboarding(c: Context) {
  try {
    const db = c.env.DB as D1Database;
    const userPayload = c.get('jwtPayload') as { id: string } | undefined;

    if (!userPayload || !userPayload.id) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const body: UserOnboarding = await c.req.json();
    if (!body.branch || !body.semester || body.attendanceTarget === undefined) {
      return c.json({ error: 'Branch, semester, and attendanceTarget are required' }, 400);
    }

    const updatedProfile = await updateUserOnboarding(db, userPayload.id, body);
    if (!updatedProfile) {
      return c.json({ error: 'User not found' }, 404);
    }

    return c.json({ user: updatedProfile });
  } catch (error) {
    return c.json({ error: (error as Error).message || 'Internal Server Error' }, 500);
  }
}
