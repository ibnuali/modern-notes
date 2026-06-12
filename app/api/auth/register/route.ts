import { NextResponse } from 'next/server';
import { registerUser } from '@/lib/auth/actions';

export async function POST(request: Request) {
  const result = await registerUser(await request.json().catch(() => null));

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
