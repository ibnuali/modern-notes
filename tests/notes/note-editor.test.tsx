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

const note2 = {
  id: 'note_2',
  title: 'Second note',
  body: 'Second body',
  createdAt: '2026-06-12T01:00:00.000Z',
  updatedAt: '2026-06-12T01:00:00.000Z',
};

describe('NoteEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('empty state', () => {
    it('renders guiding message when no notes exist', () => {
      render(<NoteEditor initialNotes={[]} />);

      expect(screen.getByText(/No notes yet/)).toBeInTheDocument();
      expect(screen.getByText(/create your first note/i)).toBeInTheDocument();
    });

    it('shows populated state when notes exist', () => {
      render(<NoteEditor initialNotes={[note]} />);

      expect(screen.getByText('Existing note')).toBeInTheDocument();
      expect(screen.queryByText(/create your first note/i)).not.toBeInTheDocument();
    });
  });

  describe('note CRUD', () => {
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

  describe('unsaved changes guard', () => {
    it('shows dirty indicator when edits are made', async () => {
      const user = userEvent.setup();
      render(<NoteEditor initialNotes={[note]} />);

      await user.type(screen.getByLabelText('Title'), ' extra');

      // dirty-indicator span is distinct from the status <p>
      expect(document.querySelector('.dirty-indicator')).toHaveTextContent('Unsaved changes');
    });

    it('shows discard dialog when switching notes with unsaved changes', async () => {
      const user = userEvent.setup();
      render(<NoteEditor initialNotes={[note, note2]} />);

      await user.type(screen.getByLabelText('Title'), ' modified');

      // Click on second note while dirty
      await user.click(screen.getByText('Second note'));

      // Discard dialog should appear
      expect(screen.getByRole('alertdialog')).toBeInTheDocument();
      expect(screen.getByText(/Discard unsaved changes/)).toBeInTheDocument();
    });

    it('keeps editor state when canceling discard', async () => {
      const user = userEvent.setup();
      render(<NoteEditor initialNotes={[note, note2]} />);

      await user.type(screen.getByLabelText('Title'), ' modified');

      // Click on second note while dirty
      await user.click(screen.getByText('Second note'));

      // Cancel the discard
      await user.click(screen.getByText('Keep editing'));

      // Should still see the original note's editor with unsaved changes
      expect(screen.getByLabelText<HTMLInputElement>('Title').value).toBe('Existing note modified');
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    });

    it('discards changes and switches note when confirm is clicked', async () => {
      const user = userEvent.setup();
      render(<NoteEditor initialNotes={[note, note2]} />);

      await user.type(screen.getByLabelText('Title'), ' modified');

      // Click on second note while dirty
      await user.click(screen.getByText('Second note'));

      // Confirm the discard
      await user.click(screen.getByText('Discard'));

      // Should now see the second note's editor
      expect(
        screen.getByLabelText<HTMLInputElement>('Title').value,
      ).toBe('Second note');
    });

    it('switches notes immediately when no unsaved changes exist', async () => {
      const user = userEvent.setup();
      render(<NoteEditor initialNotes={[note, note2]} />);

      // Click on second note (first is selected by default)
      await user.click(screen.getByText('Second note'));

      // Should switch immediately — no dialog
      expect(
        screen.getByLabelText<HTMLInputElement>('Title').value,
      ).toBe('Second note');
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    });

    it('shows discard dialog when clicking new note with unsaved changes', async () => {
      const user = userEvent.setup();
      render(<NoteEditor initialNotes={[note]} />);

      await user.type(screen.getByLabelText('Title'), ' modified');

      // Click "New note" while dirty
      await user.click(screen.getByText('New note'));

      // Discard dialog should appear
      expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    });

    it('new note creates fresh editor after discarding changes', async () => {
      const user = userEvent.setup();
      render(<NoteEditor initialNotes={[note]} />);

      await user.type(screen.getByLabelText('Title'), ' modified');

      // Click "New note" while dirty
      await user.click(screen.getByText('New note'));

      // Confirm discard
      await user.click(screen.getByText('Discard'));

      // Should show fresh editor (discard clears the form entirely)
      expect(screen.getByLabelText<HTMLInputElement>('Title').value).toBe('');
    });
  });

  describe('selected-note detail view', () => {
    it('renders selected note title and body in editor', () => {
      render(<NoteEditor initialNotes={[note]} />);

      expect(screen.getByLabelText<HTMLInputElement>('Title').value).toBe('Existing note');
      expect(screen.getByLabelText<HTMLTextAreaElement>('Body').value).toBe('Existing body');
    });

    it('highlights first note in list when it is selected', () => {
      render(<NoteEditor initialNotes={[note, note2]} />);

      // note is at index 0, so it's selected by default
      const activeItem = screen.getByText('Existing note').closest('button');
      expect(activeItem).toHaveAttribute('aria-current', 'true');

      // Second note is not active
      const inactiveItem = screen.getByText('Second note').closest('button');
      expect(inactiveItem).not.toHaveAttribute('aria-current');
    });

    it('switches highlight when selecting another note', async () => {
      const user = userEvent.setup();
      render(<NoteEditor initialNotes={[note, note2]} />);

      await user.click(screen.getByText('Second note'));

      const activeItem = screen.getByText('Second note').closest('button');
      expect(activeItem).toHaveAttribute('aria-current', 'true');
      const inactiveItem = screen.getByText('Existing note').closest('button');
      expect(inactiveItem).not.toHaveAttribute('aria-current');
    });
  });
});
