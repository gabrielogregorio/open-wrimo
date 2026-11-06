import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithLocale } from '@/test/render';
import { StatsShelf, type StatsBook } from './stats-shelf';

const push = vi.fn();

vi.mock('next/navigation', () => ({ useRouter: () => ({ push, refresh: vi.fn() }) }));

const books: StatsBook[] = [
  {
    projectId: 'p1',
    title: 'First Novel',
    coverUrl: null,
    statusLabel: 'In progress',
    goals: [{ id: 'g1', label: 'November' }],
  },
  {
    projectId: 'p2',
    title: 'Second Novel',
    coverUrl: null,
    statusLabel: 'Completed',
    goals: [
      { id: 'g2', label: 'Daily' },
      { id: 'g3', label: 'Camp' },
    ],
  },
];

describe('StatsShelf', () => {
  beforeEach(() => {
    push.mockClear();
  });

  it('opens on the book of the current goal and marks the goal link', () => {
    renderWithLocale(<StatsShelf books={books} goalId="g3" />);

    expect(screen.getByRole('radio', { name: 'Second Novel · Completed' })).toBeChecked();
    expect(screen.getByRole('link', { name: 'Camp' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Daily' })).not.toHaveAttribute('aria-current');
    expect(screen.getByRole('link', { name: 'Daily' })).toHaveAttribute('href', '/write/stats?goal=g2');
  });

  it('falls back to the first book and moves to the first goal of the chosen book', async () => {
    renderWithLocale(<StatsShelf books={books} goalId="missing" />);

    expect(screen.getByRole('radio', { name: 'First Novel · In progress' })).toBeChecked();
    await userEvent.click(screen.getByRole('radio', { name: 'Second Novel · Completed' }));

    expect(push).toHaveBeenCalledWith('/write/stats?goal=g2', { scroll: false });
    expect(screen.getByRole('navigation', { name: 'Goal' })).toHaveTextContent('DailyCamp');
  });
});
