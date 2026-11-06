import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { FormState } from '@/lib/form';
import type { GoalWithStats } from '@/lib/writing/goals';
import type { GoalStats } from '@/lib/writing/stats';
import { renderWithLocale } from '@/test/render';
import { GoalCard } from './goal-card';

const stats = (overrides: Partial<GoalStats> = {}): GoalStats =>
  ({
    state: 'active',
    total: 25000,
    percent: 50,
    remaining: 25000,
    reached: false,
    reachedOn: null,
    totalDays: 30,
    daysElapsed: 15,
    daysLeft: 15,
    writtenToday: 0,
    neededToday: 1667,
    dailyPar: 1667,
    parToday: 25000,
    averagePerDay: 1667,
    ...overrides,
  }) as GoalStats;

const goal = (overrides: Partial<GoalWithStats> = {}): GoalWithStats => ({
  id: 'g1',
  projectId: 'p1',
  name: 'November',
  unit: 'words',
  target: 50000,
  startDate: '2026-11-01',
  endDate: '2026-11-30',
  period: null,
  stats: stats(),
  ...overrides,
});

const editAction = async (): Promise<FormState> => ({});

describe('GoalCard', () => {
  it('shows the progress and the links of an active goal', () => {
    renderWithLocale(<GoalCard goal={goal()} />);

    expect(screen.getByText('November:')).toBeInTheDocument();
    expect(screen.getByText('Write 50,000 words')).toBeInTheDocument();
    expect(screen.getByText(/^Started /)).toBeInTheDocument();

    const bar = screen.getByRole('progressbar', { name: 'Progress in November' });

    expect(bar).toHaveAttribute('aria-valuenow', '50');
    expect(bar).toHaveAttribute('aria-valuetext', '50%');
    expect(screen.getByRole('link', { name: 'Update' })).toHaveAttribute('href', '/write/update?goal=g1');
    expect(screen.getByRole('link', { name: 'Stats' })).toHaveAttribute('href', '/write/stats?goal=g1');
    expect(screen.queryByRole('link', { name: 'Certificate' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Edit goal' })).not.toBeInTheDocument();
  });

  it('marks a beaten repeating goal and offers the certificate', () => {
    const beaten = goal({
      period: 'daily',
      target: 1000,
      stats: stats({ total: 1500, percent: 100, reached: true, state: 'ended' }),
    });
    const { container } = renderWithLocale(<GoalCard goal={beaten} showName={false} />);

    expect(screen.queryByText('November:')).not.toBeInTheDocument();
    expect(screen.getByText('Write 1,000 words today')).toBeInTheDocument();
    expect(screen.getByText('Renews by itself')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuetext', '150%');
    expect(container.querySelector('.goal-beaten')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Update' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Certificate' })).toHaveAttribute('href', '/write/goals/g1/certificate');
  });

  it('hides every action when read only', () => {
    renderWithLocale(<GoalCard goal={goal()} readOnly editAction={editAction} today="2026-11-15" />);

    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('opens the edit form with the delete option and closes it on cancel', async () => {
    const deleteAction = vi.fn(async () => undefined);
    renderWithLocale(<GoalCard goal={goal()} editAction={editAction} deleteAction={deleteAction} today="2026-11-15" />);

    await userEvent.click(screen.getByRole('button', { name: 'Edit goal' }));

    expect(screen.getByText('Edit goal')).toBeInTheDocument();
    expect(screen.getByLabelText('Goal name')).toHaveValue('November');
    expect(screen.getByRole('button', { name: 'Delete this goal' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(screen.queryByLabelText('Goal name')).not.toBeInTheDocument();
  });

  it('edits without a delete option', async () => {
    renderWithLocale(<GoalCard goal={goal()} editAction={editAction} today="2026-11-15" />);

    await userEvent.click(screen.getByRole('button', { name: 'Edit goal' }));

    expect(screen.getByLabelText('Goal name')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Delete this goal' })).not.toBeInTheDocument();
  });

  it('keeps the summary when there is no date to edit from', async () => {
    renderWithLocale(<GoalCard goal={goal()} editAction={editAction} />);

    await userEvent.click(screen.getByRole('button', { name: 'Edit goal' }));

    expect(screen.queryByLabelText('Goal name')).not.toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });
});
