import { beforeEach, describe, expect, it, vi } from 'vitest';

const db = {
  note: {
    create: vi.fn(),
    updateMany: vi.fn(),
    findFirstOrThrow: vi.fn(),
  },
};

vi.mock('@/lib/db', () => ({ db }));

const { createNote, updateNote } = await import('@/lib/notes/actions');

const savedNote = {
  id: 'note_1',
  userId: 'user_1',
  title: 'Saved note',
  body: 'Body',
  createdAt: new Date('2026-06-12T00:00:00.000Z'),
  updatedAt: new Date('2026-06-12T00:00:00.000Z'),
};

describe('note actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a note for the authenticated user', async () => {
    db.note.create.mockResolvedValue(savedNote);

    const result = await createNote('user_1', { title: ' Saved note ', body: 'Body' });

    expect(result).toEqual({ ok: true, note: savedNote });
    expect(db.note.create).toHaveBeenCalledWith({
      data: { userId: 'user_1', title: 'Saved note', body: 'Body' },
    });
  });

  it('returns validation errors for invalid create payloads', async () => {
    const result = await createNote('user_1', { title: '', body: 'Body' });

    expect(result).toEqual({ ok: false, error: 'Title is required.', status: 400 });
    expect(db.note.create).not.toHaveBeenCalled();
  });

  it('updates only the matching user note', async () => {
    db.note.updateMany.mockResolvedValue({ count: 1 });
    db.note.findFirstOrThrow.mockResolvedValue(savedNote);

    const result = await updateNote('user_1', 'note_1', { title: 'Saved note', body: 'Body' });

    expect(result).toEqual({ ok: true, note: savedNote });
    expect(db.note.updateMany).toHaveBeenCalledWith({
      where: { id: 'note_1', userId: 'user_1' },
      data: { title: 'Saved note', body: 'Body' },
    });
    expect(db.note.findFirstOrThrow).toHaveBeenCalledWith({ where: { id: 'note_1', userId: 'user_1' } });
  });

  it('does not update another user note', async () => {
    db.note.updateMany.mockResolvedValue({ count: 0 });

    const result = await updateNote('user_1', 'note_2', { title: 'Saved note', body: 'Body' });

    expect(result).toEqual({ ok: false, error: 'Note not found.', status: 404 });
    expect(db.note.findFirstOrThrow).not.toHaveBeenCalled();
  });

  it('returns network-safe save errors', async () => {
    db.note.create.mockRejectedValue(new Error('database unavailable'));

    const result = await createNote('user_1', { title: 'Saved note', body: 'Body' });

    expect(result).toEqual({ ok: false, error: 'Unable to save note. Please try again.', status: 500 });
  });
});
