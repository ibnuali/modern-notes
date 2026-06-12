import { NextResponse } from 'next/server';
import { loginUser } from '@/lib/auth/actions';

export async function POST(request: Request) {
  const result = await loginUser(await request.json().catch(() => null));

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 401 });
  }

  return NextResponse.json({ ok: true });
}
