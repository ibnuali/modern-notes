import { compare, hash } from 'bcryptjs';
import { z } from 'zod';
import { db } from '@/lib/db';
import { createSession, clearSession } from '@/lib/auth/session';
import { AUTH_ERROR_MESSAGE, REGISTER_ERROR_MESSAGE, AuthError } from '@/lib/auth/errors';

const emailSchema = z.string().trim().email().toLowerCase();
const passwordSchema = z.string().min(8).max(128);
const nameSchema = z.string().trim().max(80).optional();

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  name: nameSchema,
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(128),
});

export type AuthResult =
  | { ok: true }
  | { ok: false; error: string };

export async function registerUser(input: unknown): Promise<AuthResult> {
  const parsed = registerSchema.safeParse(input);

  if (!parsed.success) {
    return { ok: false, error: REGISTER_ERROR_MESSAGE };
  }

  try {
    const passwordHash = await hash(parsed.data.password, 12);
    const user = await db.user.create({
      data: {
        email: parsed.data.email,
        passwordHash,
        name: parsed.data.name || null,
      },
    });

    await createSession(user.id);
    return { ok: true };
  } catch {
    return { ok: false, error: REGISTER_ERROR_MESSAGE };
  }
}

export async function loginUser(input: unknown): Promise<AuthResult> {
  const parsed = loginSchema.safeParse(input);

  if (!parsed.success) {
    return { ok: false, error: AUTH_ERROR_MESSAGE };
  }

  const user = await db.user.findUnique({ where: { email: parsed.data.email } });

  if (!user) {
    return { ok: false, error: AUTH_ERROR_MESSAGE };
  }

  const passwordMatches = await compare(parsed.data.password, user.passwordHash);

  if (!passwordMatches) {
    return { ok: false, error: AUTH_ERROR_MESSAGE };
  }

  await createSession(user.id);
  return { ok: true };
}

export async function logoutUser() {
  await clearSession();
}

export function assertAuthResult(result: AuthResult) {
  if (!result.ok) {
    throw new AuthError(result.error);
  }
}
