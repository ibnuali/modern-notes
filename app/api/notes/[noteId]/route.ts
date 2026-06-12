import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { updateNote } from '@/lib/notes/actions';

type RouteContext = {
  params: Promise<{ noteId: string }>;
};

export async function PUT(request: Request, context: RouteContext) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  }

  const { noteId } = await context.params;
  const result = await updateNote(user.id, noteId, await request.json().catch(() => null));

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ note: result.note });
}
