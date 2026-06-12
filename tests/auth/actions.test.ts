import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AUTH_ERROR_MESSAGE, REGISTER_ERROR_MESSAGE } from '@/lib/auth/errors';

const createSession = vi.fn();
const db = {
  user: {
    create: vi.fn(),
    findUnique: vi.fn(),
  },
};

vi.mock('@/lib/db', () => ({ db }));
vi.mock('@/lib/auth/session', () => ({ createSession }));

const { hash } = await import('bcryptjs');
const { loginUser, registerUser } = await import('@/lib/auth/actions');

describe('auth actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('registers a user and creates a session', async () => {
    db.user.create.mockResolvedValue({ id: 'user_1' });

    const result = await registerUser({
      email: 'NEW@EXAMPLE.COM',
      password: 'password123',
      name: 'New User',
    });

    expect(result).toEqual({ ok: true });
    expect(db.user.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ email: 'new@example.com', name: 'New User' }),
    });
    expect(createSession).toHaveBeenCalledWith('user_1');
  });

  it('returns generic register errors', async () => {
    db.user.create.mockRejectedValue(new Error('unique violation: users_email_key'));

    const result = await registerUser({
      email: 'taken@example.com',
      password: 'password123',
    });

    expect(result).toEqual({ ok: false, error: REGISTER_ERROR_MESSAGE });
  });

  it('logs in with valid credentials', async () => {
    db.user.findUnique.mockResolvedValue({
      id: 'user_1',
      email: 'user@example.com',
      passwordHash: await hash('password123', 4),
    });

    const result = await loginUser({ email: 'USER@EXAMPLE.COM', password: 'password123' });

    expect(result).toEqual({ ok: true });
    expect(db.user.findUnique).toHaveBeenCalledWith({ where: { email: 'user@example.com' } });
    expect(createSession).toHaveBeenCalledWith('user_1');
  });

  it('returns same generic login error for missing user and bad password', async () => {
    db.user.findUnique.mockResolvedValueOnce(null);
    await expect(loginUser({ email: 'missing@example.com', password: 'password123' })).resolves.toEqual({
      ok: false,
      error: AUTH_ERROR_MESSAGE,
    });

    db.user.findUnique.mockResolvedValueOnce({
      id: 'user_1',
      email: 'user@example.com',
      passwordHash: await hash('password123', 4),
    });
    await expect(loginUser({ email: 'user@example.com', password: 'wrong-password' })).resolves.toEqual({
      ok: false,
      error: AUTH_ERROR_MESSAGE,
    });
  });
});
