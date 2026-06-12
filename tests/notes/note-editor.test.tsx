import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NoteEditor } from '@/components/notes/note-editor';

const refresh = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh }),
}));

const note = {
  id: 'note_1',
  title: 'Existing note',
  body: 'Existing body',
  createdAt: '2026-06-12T00:00:00.000Z',
  updatedAt: '2026-06-12T00:00:00.000Z',
};

describe('NoteEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a note and shows saved state', async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ note: { ...note, title: 'New note', body: 'New body' } }),
      }),
    );

    render(<NoteEditor initialNotes={[]} />);

    await user.type(screen.getByLabelText('Title'), 'New note');
    await user.type(screen.getByLabelText('Body'), 'New body');
    await user.click(screen.getByRole('button', { name: 'Create note' }));

    expect(fetch).toHaveBeenCalledWith('/api/notes', expect.objectContaining({ method: 'POST' }));
    expect(await screen.findByText(/Saved/)).toBeInTheDocument();
    expect(refresh).toHaveBeenCalled();
  });

  it('edits an existing note and shows saved state', async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ note: { ...note, title: 'Updated note' } }),
      }),
    );

    render(<NoteEditor initialNotes={[note]} />);

    await user.clear(screen.getByLabelText('Title'));
    await user.type(screen.getByLabelText('Title'), 'Updated note');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(fetch).toHaveBeenCalledWith('/api/notes/note_1', expect.objectContaining({ method: 'PUT' }));
    expect(await screen.findByText(/Saved/)).toBeInTheDocument();
  });

  it('shows validation or API failures', async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ error: 'Title is required.' }),
      }),
    );

    render(<NoteEditor initialNotes={[]} />);

    await user.type(screen.getByLabelText('Title'), 'Broken note');
    await user.click(screen.getByRole('button', { name: 'Create note' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Title is required.');
  });

  it('shows network failures', async () => {
    const user = userEvent.setup();
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));

    render(<NoteEditor initialNotes={[]} />);

    await user.type(screen.getByLabelText('Title'), 'Offline note');
    await user.click(screen.getByRole('button', { name: 'Create note' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Network failure.');
  });
});
