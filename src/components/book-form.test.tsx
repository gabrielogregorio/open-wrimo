import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { BookView } from '@/lib/books/repository';
import type { FormState } from '@/lib/form';
import { renderWithLocale } from '@/test/render';
import { BookForm } from './book-form';

const BOOK: BookView = {
  id: '6650f0c2a1b2c3d4e5f60718',
  title: 'Capitães da Areia',
  author: 'Jorge Amado',
  totalPages: 280,
  currentPage: 45,
  status: 'reading',
  rating: 4,
  notes: 'Salvador nights.',
  bookmarks: [],
  updatedAt: '2026-03-01T10:00:00.000Z',
};

describe('BookForm', () => {
  it('starts empty for a new book and sends what was typed', async () => {
    const action = vi.fn(async (_state: FormState, _formData: FormData): Promise<FormState> => ({}));
    renderWithLocale(<BookForm action={action} />);

    expect(screen.getByLabelText('Current page')).toHaveValue(0);
    await userEvent.type(screen.getByLabelText('Title'), 'Iracema');
    await userEvent.type(screen.getByLabelText('Author'), 'José de Alencar');
    await userEvent.type(screen.getByLabelText('Total pages'), '150');
    await userEvent.selectOptions(screen.getByLabelText('Rating'), '5 of 5 stars');
    await userEvent.click(screen.getByRole('button', { name: 'Add to shelf' }));

    expect(Object.fromEntries(action.mock.calls[0][1])).toEqual({
      title: 'Iracema',
      author: 'José de Alencar',
      totalPages: '150',
      currentPage: '0',
      status: 'want',
      rating: '5',
      notes: '',
    });
  });

  it('fills the fields of an existing book', () => {
    renderWithLocale(<BookForm action={async () => ({})} book={BOOK} />, 'pt-BR');

    expect(screen.getByLabelText('Título')).toHaveValue('Capitães da Areia');
    expect(screen.getByLabelText('Situação')).toHaveDisplayValue('Lendo');
    expect(screen.getByLabelText('Nota')).toHaveDisplayValue('4 de 5 estrelas');
    expect(screen.getByLabelText('Anotações')).toHaveValue('Salvador nights.');
    expect(screen.getByRole('button', { name: 'Salvar alterações' })).toBeInTheDocument();
  });

  it('keeps an unrated book without a rating', () => {
    renderWithLocale(<BookForm action={async () => ({})} book={{ ...BOOK, rating: null }} />);

    expect(screen.getByLabelText('Rating')).toHaveDisplayValue('No rating');
  });

  it('shows the errors and keeps what was typed', async () => {
    const action = async (): Promise<FormState> => ({
      error: 'This book is not on your shelf.',
      fieldErrors: { title: 'Enter a title up to 200 characters.', notes: 'Keep notes under 4000 characters.' },
      values: { ...Object.fromEntries(Object.entries(BOOK).map(([key, value]) => [key, String(value)])), rating: '' },
    });
    renderWithLocale(<BookForm action={action} book={BOOK} />);

    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('This book is not on your shelf.');
    expect(screen.getByLabelText('Title')).toHaveAccessibleDescription('Enter a title up to 200 characters.');
    expect(screen.getByLabelText('Notes')).toHaveAccessibleDescription('Keep notes under 4000 characters.');
    expect(screen.getByLabelText('Notes')).toHaveAttribute('aria-invalid', 'true');
  });

  it('marks an invalid rating', async () => {
    const action = async (): Promise<FormState> => ({ fieldErrors: { rating: 'Choose a rating from 1 to 5.' } });
    renderWithLocale(<BookForm action={action} />);

    await userEvent.click(screen.getByRole('button', { name: 'Add to shelf' }));

    expect(await screen.findByLabelText('Rating')).toHaveAttribute('aria-invalid', 'true');
  });
});
