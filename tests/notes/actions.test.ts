import { beforeEach, describe, expect, it, vi } from 'vitest';

const db = {
  note: {
    create: vi.fn(),
    updateMany: vi.fn(),
    findFirstOrThrow: vi.fn(),
    findMany: vi.fn(),
  },
};

vi.mock('@/lib/db', () => ({ db }));

const { createNote, updateNote, searchNotes } = await import('@/lib/notes/actions');

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

  describe('searchNotes', () => {
    const notes = [
      { id: 'note_1', userId: 'user_1', title: 'Meeting notes', body: 'Discussed Q2 roadmap', createdAt: new Date('2026-06-01'), updatedAt: new Date('2026-06-10') },
      { id: 'note_2', userId: 'user_1', title: 'Shopping list', body: 'Milk, eggs, bread', createdAt: new Date('2026-06-02'), updatedAt: new Date('2026-06-11') },
      { id: 'note_3', userId: 'user_1', title: 'Ideas for project', body: 'Roadmap planning session notes', createdAt: new Date('2026-06-03'), updatedAt: new Date('2026-06-12') },
    ];

    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('returns matching notes by title', async () => {
      const matching = [notes[2]];
      db.note.findMany.mockResolvedValue(matching);

      const result = await searchNotes('user_1', 'ideas');

      expect(result).toEqual({ ok: true, notes: matching });
      expect(db.note.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'user_1',
          OR: [
            { title: { contains: 'ideas', mode: 'insensitive' } },
            { body: { contains: 'ideas', mode: 'insensitive' } },
          ],
        },
        orderBy: { updatedAt: 'desc' },
      });
    });

    it('returns matching notes by body', async () => {
      const matching = [notes[0], notes[2]];
      db.note.findMany.mockResolvedValue(matching);

      const result = await searchNotes('user_1', 'roadmap');

      expect(result).toEqual({ ok: true, notes: matching });
    });

    it('returns empty array when nothing matches', async () => {
      db.note.findMany.mockResolvedValue([]);

      const result = await searchNotes('user_1', 'nonexistent');

      expect(result).toEqual({ ok: true, notes: [] });
    });

    it('enforces ownership isolation', async () => {
      db.note.findMany.mockResolvedValue([]);

      const result = await searchNotes('user_2', 'Meeting');

      expect(result).toEqual({ ok: true, notes: [] });
      expect(db.note.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ userId: 'user_2' }),
        }),
      );
    });

    it('returns all notes when query is empty', async () => {
      db.note.findMany.mockResolvedValue(notes);

      const result = await searchNotes('user_1', '');

      expect(result).toEqual({ ok: true, notes });
      expect(db.note.findMany).toHaveBeenCalledWith({
        where: { userId: 'user_1' },
        orderBy: { updatedAt: 'desc' },
      });
    });

    it('returns all notes when query has only whitespace', async () => {
      db.note.findMany.mockResolvedValue(notes);

      const result = await searchNotes('user_1', '   ');

      expect(result).toEqual({ ok: true, notes });
      expect(db.note.findMany).toHaveBeenCalledWith({
        where: { userId: 'user_1' },
        orderBy: { updatedAt: 'desc' },
      });
    });

    it('performs case-insensitive matching', async () => {
      const matching = [notes[1]];
      db.note.findMany.mockResolvedValue(matching);

      const result = await searchNotes('user_1', 'SHOPPING');

      expect(result).toEqual({ ok: true, notes: matching });
    });

    it('trims whitespace from query', async () => {
      const matching = [notes[0]];
      db.note.findMany.mockResolvedValue(matching);

      const result = await searchNotes('user_1', '  meeting  ');

      expect(result).toEqual({ ok: true, notes: matching });
    });

    it('returns network-safe error on failure', async () => {
      db.note.findMany.mockRejectedValue(new Error('database unavailable'));

      const result = await searchNotes('user_1', 'meeting');

      expect(result).toEqual({ ok: false, error: 'Unable to search notes. Please try again.', status: 500 });
    });
  });
});
