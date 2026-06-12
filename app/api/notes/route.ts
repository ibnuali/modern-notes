import { NextResponse } from 'next/server';
import { createNote } from '@/lib/notes/actions';
import { getCurrentUser } from '@/lib/auth/session';

export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  }

  const result = await createNote(user.id, await request.json().catch(() => null));

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ note: result.note }, { status: 201 });
}
