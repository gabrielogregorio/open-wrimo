import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { BookView } from '@/lib/books/repository';
import type { FormState } from '@/lib/form';
import { renderWithLocale } from '@/test/render';
import { BookSpine, Shelf } from './book-spine';
import { Bookmarks } from './bookmarks';
import { DeleteBookForm } from './delete-book-form';
import { ProgressBar } from './progress-bar';
import { ProgressForm } from './progress-form';

const BOOK: BookView = {
  id: '6650f0c2a1b2c3d4e5f60718',
  title: 'Macunaíma',
  author: 'Mário de Andrade',
  totalPages: 250,
  currentPage: 100,
  status: 'reading',
  rating: null,
  notes: '',
  bookmarks: [],
  updatedAt: '2026-03-01T10:00:00.000Z',
};

const BOOKMARKS = [
  { id: 'a1', page: 12, note: 'The beginning', createdAt: '2026-03-01T10:00:00.000Z' },
  { id: 'b2', page: 80, note: '', createdAt: '2026-03-01T10:00:00.000Z' },
];

describe('ProgressBar', () => {
  it('exposes the percent read', () => {
    render(<ProgressBar currentPage={100} totalPages={250} label="Reading progress" />);

    expect(screen.getByRole('progressbar', { name: 'Reading progress' })).toHaveAttribute('aria-valuenow', '40');
  });
});

describe('Shelf', () => {
  it('lists each book as a link with its title and author', () => {
    render(<Shelf books={[BOOK]} label="Books on the shelf" />);

    expect(screen.getByRole('region', { name: 'Books on the shelf' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Macunaíma Mário de Andrade' })).toHaveAttribute(
      'href',
      `/shelf/${BOOK.id}`,
    );
  });

  it('sizes the spine from the page count', () => {
    render(
      <ul>
        <BookSpine book={BOOK} />
      </ul>,
    );

    expect(screen.getByRole('link').style.width).toBe('2.75rem');
  });
});

describe('ProgressForm', () => {
  it('sends the page and confirms the save', async () => {
    const action = vi.fn(async (_state: FormState, _formData: FormData): Promise<FormState> => ({ saved: true }));
    renderWithLocale(<ProgressForm action={action} currentPage={100} totalPages={250} />);
    const input = screen.getByLabelText('I am on page');

    await userEvent.clear(input);
    await userEvent.type(input, '130');
    await userEvent.click(screen.getByRole('button', { name: 'Update' }));

    expect(action.mock.calls[0][1].get('currentPage')).toBe('130');
    expect(await screen.findByRole('status')).toHaveTextContent('Progress saved.');
  });

  it('shows the errors in Portuguese', async () => {
    const action = async (): Promise<FormState> => ({
      error: 'This book is not on your shelf.',
      fieldErrors: { currentPage: 'Enter a page from 0 to the last page.' },
      values: { currentPage: '999' },
    });
    renderWithLocale(<ProgressForm action={action} currentPage={100} totalPages={250} />, 'pt-BR');

    await userEvent.click(screen.getByRole('button', { name: 'Atualizar' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Este livro não está na sua estante.');
    expect(screen.getByLabelText('Estou na página')).toHaveAccessibleDescription(
      'Informe uma página entre 0 e a última.',
    );
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
  });
});

describe('Bookmarks', () => {
  it('invites the first bookmark when there is none', () => {
    renderWithLocale(<Bookmarks bookmarks={[]} addAction={async () => ({})} removeAction={async () => undefined} />);

    expect(screen.getByText('No bookmarks yet. Mark a page you want to come back to.')).toBeInTheDocument();
  });

  it('lists the bookmarks and removes the chosen one', async () => {
    const removeAction = vi.fn(async (_bookmarkId: string) => undefined);
    renderWithLocale(<Bookmarks bookmarks={BOOKMARKS} addAction={async () => ({})} removeAction={removeAction} />);

    expect(screen.getByText('The beginning')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Remove bookmark on page 80' }));

    expect(removeAction).toHaveBeenCalledWith('b2', expect.any(FormData));
  });

  it('adds a bookmark with a page and a note', async () => {
    const addAction = vi.fn(async (_state: FormState, _formData: FormData): Promise<FormState> => ({ saved: true }));
    renderWithLocale(<Bookmarks bookmarks={[]} addAction={addAction} removeAction={async () => undefined} />);

    await userEvent.type(screen.getByLabelText('Bookmark page'), '42');
    await userEvent.type(screen.getByLabelText('Note'), 'Ai que preguiça');
    await userEvent.click(screen.getByRole('button', { name: 'Add bookmark' }));

    expect(Object.fromEntries(addAction.mock.calls[0][1])).toEqual({ page: '42', note: 'Ai que preguiça' });
  });

  it('shows the errors of a refused bookmark', async () => {
    const addAction = async (): Promise<FormState> => ({
      error: 'This book is not on your shelf.',
      fieldErrors: { page: 'Enter a page inside the book.', note: 'Keep the note under 500 characters.' },
      values: { page: '0', note: 'long' },
    });
    renderWithLocale(<Bookmarks bookmarks={[]} addAction={addAction} removeAction={async () => undefined} />);

    await userEvent.click(screen.getByRole('button', { name: 'Add bookmark' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('This book is not on your shelf.');
    expect(screen.getByLabelText('Bookmark page')).toHaveAccessibleDescription('Enter a page inside the book.');
    expect(screen.getByLabelText('Note')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText('Keep the note under 500 characters.')).toBeInTheDocument();
  });
});

describe('DeleteBookForm', () => {
  it('asks before removing and can be cancelled', async () => {
    const action = vi.fn(async () => undefined);
    renderWithLocale(<DeleteBookForm action={action} />);

    await userEvent.click(screen.getByRole('button', { name: 'Remove from shelf' }));
    expect(screen.getByText('Remove this book and its bookmarks?')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Keep it' }));

    expect(screen.getByRole('button', { name: 'Remove from shelf' })).toBeInTheDocument();
    expect(action).not.toHaveBeenCalled();
  });

  it('removes after the confirmation', async () => {
    const action = vi.fn(async () => undefined);
    renderWithLocale(<DeleteBookForm action={action} />);

    await userEvent.click(screen.getByRole('button', { name: 'Remove from shelf' }));
    await userEvent.click(screen.getByRole('button', { name: 'Yes, remove it' }));

    expect(action).toHaveBeenCalledTimes(1);
  });
});
