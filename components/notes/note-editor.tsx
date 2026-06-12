'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

type Note = {
  id: string;
  title: string;
  body: string;
  updatedAt: string | Date;
  createdAt: string | Date;
};

type NoteEditorProps = {
  initialNotes: Note[];
};

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

function formatSavedAt(value: string | Date) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function NoteEditor({ initialNotes }: NoteEditorProps) {
  const router = useRouter();
  const [notes, setNotes] = useState(initialNotes);
  const [selectedId, setSelectedId] = useState(initialNotes[0]?.id ?? 'new');
  const selectedNote = useMemo(
    () => notes.find((note) => note.id === selectedId) ?? null,
    [notes, selectedId],
  );
  const [title, setTitle] = useState(selectedNote?.title ?? '');
  const [body, setBody] = useState(selectedNote?.body ?? '');
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [message, setMessage] = useState('Unsaved note');

  useEffect(() => {
    setTitle(selectedNote?.title ?? '');
    setBody(selectedNote?.body ?? '');
    setSaveState('idle');
    setMessage(selectedNote ? `Saved ${formatSavedAt(selectedNote.updatedAt)}` : 'Unsaved note');
  }, [selectedNote]);

  async function saveNote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaveState('saving');
    setMessage('Saving…');

    const endpoint = selectedNote ? `/api/notes/${selectedNote.id}` : '/api/notes';
    const method = selectedNote ? 'PUT' : 'POST';

    try {
      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, body }),
      });
      const data = (await response.json().catch(() => null)) as { note?: Note; error?: string } | null;

      if (!response.ok || !data?.note) {
        setSaveState('error');
        setMessage(data?.error ?? 'Unable to save note. Please try again.');
        return;
      }

      setNotes((current) => {
        const withoutSaved = current.filter((note) => note.id !== data.note!.id);
        return [data.note!, ...withoutSaved];
      });
      setSelectedId(data.note.id);
      setSaveState('saved');
      setMessage(`Saved ${formatSavedAt(data.note.updatedAt)}`);
      router.refresh();
    } catch {
      setSaveState('error');
      setMessage('Network failure. Check your connection and try again.');
    }
  }

  function startNewNote() {
    setSelectedId('new');
  }

  return (
    <div className="notes-grid">
      <aside className="notes-list" aria-label="Saved notes">
        <button type="button" onClick={startNewNote} className="secondary-button">
          New note
        </button>
        {notes.length === 0 ? (
          <p className="muted">No notes yet.</p>
        ) : (
          <ul>
            {notes.map((note) => (
              <li key={note.id}>
                <button
                  type="button"
                  className={note.id === selectedId ? 'note-list-item active' : 'note-list-item'}
                  onClick={() => setSelectedId(note.id)}
                  aria-current={note.id === selectedId ? 'true' : undefined}
                >
                  <strong>{note.title}</strong>
                  <span>{formatSavedAt(note.updatedAt)}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </aside>

      <form className="note-form" onSubmit={saveNote}>
        <label>
          Title
          <input
            name="title"
            value={title}
            onChange={(event) => {
              setTitle(event.target.value);
              setSaveState('idle');
              setMessage('Unsaved changes');
            }}
            maxLength={200}
            required
          />
        </label>

        <label>
          Body
          <textarea
            name="body"
            value={body}
            onChange={(event) => {
              setBody(event.target.value);
              setSaveState('idle');
              setMessage('Unsaved changes');
            }}
            rows={14}
          />
        </label>

        <div className="note-actions">
          <button type="submit" disabled={saveState === 'saving'}>
            {saveState === 'saving' ? 'Saving…' : selectedNote ? 'Save changes' : 'Create note'}
          </button>
          <p role={saveState === 'error' ? 'alert' : 'status'} className={`save-state ${saveState}`}>
            {message}
          </p>
        </div>
      </form>
    </div>
  );
}
