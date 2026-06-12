import { describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { proxy } from '@/proxy';
import { SESSION_COOKIE_NAME } from '@/lib/auth/constants';

function request(path: string, cookie?: string) {
  return new NextRequest(`https://notes.test${path}`, {
    headers: cookie ? { cookie } : undefined,
  });
}

describe('auth middleware', () => {
  it('redirects anonymous notes access to login', () => {
    const response = proxy(request('/notes'));

    expect(response?.status).toBe(307);
    expect(response?.headers.get('location')).toBe('https://notes.test/login');
  });

  it('allows notes access with a session cookie', () => {
    const response = proxy(request('/notes', `${SESSION_COOKIE_NAME}=token`));

    expect(response?.status).toBe(200);
    expect(response?.headers.get('location')).toBeNull();
  });
});
