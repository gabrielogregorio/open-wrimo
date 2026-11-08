import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { FormState } from '@/lib/form';
import { renderWithLocale } from '@/test/render';
import { UpdateForm, type BookChoice } from './update-form';

const books: BookChoice[] = [
  {
    projectId: 'p1',
    title: 'First Novel',
    coverUrl: null,
    statusLabel: 'In progress',
    goals: [
      { id: 'g1', label: 'Draft', unitLabel: 'words', total: 1234 },
      { id: 'g2', label: 'Edit', detail: 'November', unitLabel: 'pages', total: 10 },
    ],
  },
  {
    projectId: 'p2',
    title: 'Second Novel',
    coverUrl: null,
    statusLabel: 'Not started',
    goals: [{ id: 'g3', label: 'Outline', detail: 'Camp', unitLabel: 'hours', total: 5 }],
  },
  {
    projectId: 'p3',
    title: 'Third Novel',
    coverUrl: null,
    statusLabel: 'Completed',
    goals: [{ id: 'g4', label: 'Poems', unitLabel: 'words', total: 0 }],
  },
];

const hiddenGoal = (): string | null => document.querySelector<HTMLInputElement>('input[name="goal"]')?.value ?? null;

const saved = async (): Promise<FormState> => ({ saved: true });

describe('UpdateForm', () => {
  it('falls back to the first goal and lets the writer pick another one', async () => {
    renderWithLocale(<UpdateForm action={saved} books={books} selectedGoal="missing" today="2026-11-05" />);

    expect(hiddenGoal()).toBe('g1');
    expect(screen.getByRole('radio', { name: 'Draft' })).toBeChecked();
    expect(screen.getByLabelText('How many words did you write?')).toHaveValue('');
    expect(screen.getByLabelText('Day')).toHaveValue('2026-11-05');
    expect(screen.getByLabelText('How did it feel?')).toHaveValue('');

    await userEvent.click(screen.getByRole('radio', { name: /Edit/ }));

    expect(hiddenGoal()).toBe('g2');
    expect(screen.getByText(/November/)).toBeInTheDocument();
    expect(screen.getByLabelText('How many pages did you write?')).toBeInTheDocument();
  });

  it('switches books and shows the single goal with or without detail', async () => {
    renderWithLocale(<UpdateForm action={saved} books={books} selectedGoal="g3" today="2026-11-05" />);

    expect(hiddenGoal()).toBe('g3');
    expect(screen.getByText('Goal: Outline · Camp')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Next book' }));

    expect(hiddenGoal()).toBe('g4');
    expect(screen.getByText('Goal: Poems')).toBeInTheDocument();
  });

  it('asks for the new total in set mode', async () => {
    renderWithLocale(<UpdateForm action={saved} books={books} selectedGoal="g1" today="2026-11-05" />);

    await userEvent.click(screen.getByRole('radio', { name: 'Set my new total' }));

    expect(screen.getByLabelText('Total words so far')).toHaveAccessibleDescription('Now: 1.234');

    await userEvent.click(screen.getByRole('radio', { name: 'Add to what I had' }));

    expect(screen.getByLabelText('How many words did you write?')).toBeInTheDocument();
  });

  it('offers the moods in the feminine for she/her and in the masculine otherwise', () => {
    const { unmount } = renderWithLocale(
      <UpdateForm action={saved} books={books} selectedGoal="g1" today="2026-11-05" pronouns="she" />,
      'pt-BR',
    );

    expect(screen.getByRole('option', { name: 'Travada' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Animada' })).toBeInTheDocument();
    unmount();
    renderWithLocale(<UpdateForm action={saved} books={books} selectedGoal="g1" today="2026-11-05" />, 'pt-BR');

    expect(screen.getByRole('option', { name: 'Travado' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Feliz' })).toBeInTheDocument();
  });

  it('sends the update and confirms it was saved', async () => {
    const action = vi.fn(async (_state: FormState, _formData: FormData): Promise<FormState> => ({ saved: true }));
    renderWithLocale(<UpdateForm action={action} books={books} selectedGoal="g1" today="2026-11-05" />);

    await userEvent.type(screen.getByLabelText('How many words did you write?'), '500');
    await userEvent.selectOptions(screen.getByLabelText('How did it feel?'), 'proud');
    await userEvent.type(screen.getByLabelText('Where did you write?'), 'Cafe');
    await userEvent.click(screen.getByRole('button', { name: 'Update' }));

    expect(await screen.findByText('Progress saved.')).toBeInTheDocument();
    expect(Object.fromEntries(action.mock.calls[0][1])).toMatchObject({
      goal: 'g1',
      mode: 'add',
      count: '500',
      date: '2026-11-05',
      mood: 'proud',
      place: 'Cafe',
    });
    expect(screen.getByLabelText('How many words did you write?')).toHaveValue('');
  });

  it('shows errors and keeps the typed values', async () => {
    const action = async (): Promise<FormState> => ({
      error: 'Something went wrong.',
      fieldErrors: { count: 'Enter a number.', date: 'Pick a day.' },
      values: { goal: 'g2', count: '42', date: '2026-11-01' },
    });
    renderWithLocale(<UpdateForm action={action} books={books} selectedGoal="g1" today="2026-11-05" />);

    await userEvent.type(screen.getByLabelText('How many words did you write?'), '42');
    await userEvent.click(screen.getByRole('button', { name: 'Update' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Something went wrong.');
    expect(screen.getByLabelText('How many words did you write?')).toHaveValue('42');
    expect(screen.getByLabelText('How many words did you write?')).toHaveAccessibleDescription('Enter a number.');
    expect(screen.getByLabelText('Day')).toHaveValue('2026-11-01');
    expect(screen.getByRole('status')).toHaveTextContent('');
  });

  it('uses the fixed count and hides mood and place in compact mode', () => {
    renderWithLocale(
      <UpdateForm action={saved} books={books} selectedGoal="g1" today="2026-11-05" fixedCount={750} compact />,
    );

    expect(screen.getByLabelText('How many words did you write?')).toHaveValue('750');
    expect(screen.queryByLabelText('How did it feel?')).not.toBeInTheDocument();
    expect(document.querySelector<HTMLInputElement>('input[name="place"]')).toHaveAttribute('type', 'hidden');
  });
});
