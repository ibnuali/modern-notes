import { NoteEditor } from '@/components/notes/note-editor';
import { requireUser } from '@/lib/auth/session';
import { db } from '@/lib/db';

export default async function NotesPage() {
  const user = await requireUser();
  const notes = await db.note.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: 'desc' },
  });

  return (
    <section className="notes-shell">
      <p className="eyebrow">Private workspace</p>
      <h1>Your notes</h1>
      <p>Signed in as {user.email}. Create notes, edit existing notes, and save changes.</p>
      <NoteEditor
        initialNotes={notes.map((note) => ({
          ...note,
          createdAt: note.createdAt.toISOString(),
          updatedAt: note.updatedAt.toISOString(),
        }))}
      />
    </section>
  );
}
