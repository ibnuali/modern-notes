'use client';

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
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

function editorStateMatchesNote(title: string, body: string, note: Note | null): boolean {
  if (!note) return title === '' && body === '';
  return title === note.title && body === note.body;
}

export function NoteEditor({ initialNotes }: NoteEditorProps) {
  const router = useRouter();
  const [notes, setNotes] = useState(initialNotes);
  const [selectedId, setSelectedId] = useState(initialNotes[0]?.id ?? 'new');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Note[] | null>(null);
  const [searching, setSearching] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchAbortRef = useRef<AbortController | null>(null);

  const visibleNotes = searchResults ?? notes;

  const selectedNote = useMemo(
    () => visibleNotes.find((note) => note.id === selectedId) ?? null,
    [visibleNotes, selectedId],
  );

  const [title, setTitle] = useState(selectedNote?.title ?? '');
  const [body, setBody] = useState(selectedNote?.body ?? '');
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [message, setMessage] = useState('Unsaved note');
  const [pendingDiscardTarget, setPendingDiscardTarget] = useState<string | null>(null);

  const isDirty = useMemo(
    () => !editorStateMatchesNote(title, body, selectedNote),
    [title, body, selectedNote],
  );

  const latestSaveAbort = useRef<AbortController | null>(null);

  // Confirm on external navigation when dirty
  useEffect(() => {
    function warn(e: BeforeUnloadEvent) {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    }

    if (isDirty) {
      window.addEventListener('beforeunload', warn);
    }
    return () => window.removeEventListener('beforeunload', warn);
  }, [isDirty]);

  // Debounced search with abort + unmount guard
  useEffect(() => {
    if (searchTimer.current) {
      clearTimeout(searchTimer.current);
    }

    searchAbortRef.current?.abort();

    const trimmed = searchQuery.trim();

    if (!trimmed) {
      setSearchResults(null);
      setSearching(false);
      return;
    }

    setSearching(true);

    let ignore = false;

    searchTimer.current = setTimeout(async () => {
      const ac = new AbortController();
      searchAbortRef.current = ac;

      try {
        const response = await fetch(`/api/notes/search?q=${encodeURIComponent(trimmed)}`, {
          signal: ac.signal,
        });
        const data = await response.json().catch(() => null);

        if (ignore) return;

        if (!response.ok || !data?.notes) {
          setSearchResults([]);
        } else {
          setSearchResults(data.notes as Note[]);
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        if (ignore) return;
        setSearchResults([]);
      } finally {
        if (!ignore) setSearching(false);
      }
    }, 300);

    return () => {
      searchAbortRef.current?.abort();
      if (searchTimer.current) {
        clearTimeout(searchTimer.current);
      }
      ignore = true;
    };
  }, [searchQuery]);

  function commitDiscard() {
    if (!pendingDiscardTarget) return;
    const target = pendingDiscardTarget;
    setPendingDiscardTarget(null);
    setSelectedId(target);
  }

  const trySelectNote = useCallback(
    (id: string) => {
      if (id === selectedId) return;

      if (isDirty) {
        setPendingDiscardTarget(id);
      } else {
        setSelectedId(id);
      }
    },
    [isDirty, selectedId],
  );

  function confirmDiscard() {
    commitDiscard();
  }

  function cancelDiscard() {
    setPendingDiscardTarget(null);
  }

  // Sync editor state when switching notes (triggered by selectedNote change)
  useEffect(() => {
    setTitle(selectedNote?.title ?? '');
    setBody(selectedNote?.body ?? '');
    setSaveState('idle');
    setMessage(selectedNote ? `Saved ${formatSavedAt(selectedNote.updatedAt)}` : 'Unsaved note');
  }, [selectedNote]);

  async function saveNote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    latestSaveAbort.current?.abort();
    const ac = new AbortController();
    latestSaveAbort.current = ac;

    setSaveState('saving');
    setMessage('Saving…');

    const endpoint = selectedNote ? `/api/notes/${selectedNote.id}` : '/api/notes';
    const method = selectedNote ? 'PUT' : 'POST';

    try {
      const response = await fetch(endpoint, {
        signal: ac.signal,
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, body }),
      });
      const data = (await response.json().catch(() => null)) as { note?: Note; error?: string } | null;

      if (ac.signal.aborted) return;

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
      // Clear search after save
      setSearchQuery('');
      setSearchResults(null);
      router.refresh();
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setSaveState('error');
      setMessage('Network failure. Check your connection and try again.');
    }
  }

  function startNewNote() {
    trySelectNote('new');
  }

  return (
    <div className="notes-grid">
      <aside className="notes-list" aria-label="Saved notes">
        <div className="notes-list-controls">
          <button type="button" onClick={startNewNote} className="secondary-button">
            New note
          </button>
          <div className="search-wrapper">
            <input
              type="search"
              placeholder="Search notes…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search notes by title or body"
              className="search-input"
            />
            {searching && <span className="search-spinner" aria-label="Searching" />}
          </div>
        </div>

        {notes.length === 0 ? (
          <div className="empty-state">
            <p className="empty-state-text">
              No notes yet — create your first note to get started.
            </p>
          </div>
        ) : visibleNotes.length === 0 ? (
          <div className="empty-state">
            <p className="empty-state-text">
              No notes match <strong>{searchQuery}</strong>.
            </p>
          </div>
        ) : (
          <ul>
            {visibleNotes.map((note) => (
              <li key={note.id}>
                <button
                  type="button"
                  className={note.id === selectedId ? 'note-list-item active' : 'note-list-item'}
                  onClick={() => trySelectNote(note.id)}
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

      {pendingDiscardTarget ? (
        <div className="discard-dialog" role="alertdialog" aria-labelledby="discard-heading">
          <p id="discard-heading" className="discard-heading">
            Discard unsaved changes?
          </p>
          <p className="discard-message">
            Switching notes will discard your unsaved edits.
          </p>
          <div className="discard-actions">
            <button type="button" className="secondary-button" onClick={cancelDiscard}>
              Keep editing
            </button>
            <button type="button" className="destructive-button" onClick={confirmDiscard}>
              Discard
            </button>
          </div>
        </div>
      ) : (
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
            {isDirty && <span className="dirty-indicator">Unsaved changes</span>}
            <button type="submit" disabled={saveState === 'saving'}>
              {saveState === 'saving' ? 'Saving…' : selectedNote ? 'Save changes' : 'Create note'}
            </button>
            <p role={saveState === 'error' ? 'alert' : 'status'} className={`save-state ${saveState}`}>
              {message}
            </p>
          </div>
        </form>
      )}
    </div>
  );
}
