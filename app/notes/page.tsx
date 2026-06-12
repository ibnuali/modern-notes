import { requireUser } from '@/lib/auth/session';

export default async function NotesPage() {
  const user = await requireUser();

  return (
    <section className="notes-shell">
      <p className="eyebrow">Private workspace</p>
      <h1>Your notes</h1>
      <p>Signed in as {user.email}. Note creation arrives in the next slice.</p>
      <div className="empty-state">
        <h2>No notes yet</h2>
        <p>Create/edit flow is next; this route already enforces authenticated access.</p>
      </div>
    </section>
  );
}
