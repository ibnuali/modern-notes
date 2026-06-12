import { z } from 'zod';
import { db } from '@/lib/db';

const NOTE_ERROR_MESSAGE = 'Unable to save note. Please try again.';
const NOTE_NOT_FOUND_MESSAGE = 'Note not found.';

export const noteSchema = z.object({
  title: z.string().trim().min(1, 'Title is required.').max(200, 'Title must be 200 characters or fewer.'),
  body: z.string().max(20000, 'Body must be 20,000 characters or fewer.'),
});

export type NoteResult =
  | {
      ok: true;
      note: {
        id: string;
        title: string;
        body: string;
        updatedAt: Date;
        createdAt: Date;
      };
    }
  | { ok: false; error: string; status: number };

function toValidationError(error: z.ZodError) {
  return error.issues[0]?.message ?? NOTE_ERROR_MESSAGE;
}

export async function createNote(userId: string, input: unknown): Promise<NoteResult> {
  const parsed = noteSchema.safeParse(input);

  if (!parsed.success) {
    return { ok: false, error: toValidationError(parsed.error), status: 400 };
  }

  try {
    const note = await db.note.create({
      data: {
        userId,
        title: parsed.data.title,
        body: parsed.data.body,
      },
    });

    return { ok: true, note };
  } catch {
    return { ok: false, error: NOTE_ERROR_MESSAGE, status: 500 };
  }
}

export async function searchNotes(
  userId: string,
  query: string,
): Promise<
  | {
      ok: true;
      notes: Array<{
        id: string;
        title: string;
        body: string;
        updatedAt: Date;
        createdAt: Date;
      }>;
    }
  | { ok: false; error: string; status: number }
> {
  try {
    const trimmed = query.trim();

    const notes = await db.note.findMany({
      where: {
        userId,
        ...(trimmed
          ? {
              OR: [
                { title: { contains: trimmed, mode: 'insensitive' } },
                { body: { contains: trimmed, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: { updatedAt: 'desc' },
    });

    return { ok: true, notes };
  } catch {
    return { ok: false, error: 'Unable to search notes. Please try again.', status: 500 };
  }
}

export async function updateNote(userId: string, noteId: string, input: unknown): Promise<NoteResult> {
  const parsed = noteSchema.safeParse(input);

  if (!parsed.success) {
    return { ok: false, error: toValidationError(parsed.error), status: 400 };
  }

  try {
    const result = await db.note.updateMany({
      where: { id: noteId, userId },
      data: {
        title: parsed.data.title,
        body: parsed.data.body,
      },
    });

    if (result.count === 0) {
      return { ok: false, error: NOTE_NOT_FOUND_MESSAGE, status: 404 };
    }

    const note = await db.note.findFirstOrThrow({ where: { id: noteId, userId } });
    return { ok: true, note };
  } catch (error) {
    if (error instanceof Error && error.message === NOTE_NOT_FOUND_MESSAGE) {
      return { ok: false, error: NOTE_NOT_FOUND_MESSAGE, status: 404 };
    }

    return { ok: false, error: NOTE_ERROR_MESSAGE, status: 500 };
  }
}
