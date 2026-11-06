import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { FormState } from '@/lib/form';
import type { GoalView } from '@/lib/writing/repository';
import { renderWithLocale } from '@/test/render';
import { GoalForm } from './goal-form';

const submitted = (action: ReturnType<typeof vi.fn>): Record<string, FormDataEntryValue> =>
  Object.fromEntries(action.mock.calls[0][1] as FormData);

const existing: GoalView = {
  id: 'g1',
  projectId: 'p1',
  name: 'Every month',
  unit: 'pages',
  target: 30,
  startDate: '2026-11-01',
  endDate: '2026-11-30',
  period: 'monthly',
};

describe('GoalForm', () => {
  it('creates a goal between two dates with the defaults', async () => {
    const action = vi.fn(async (_state: FormState, _formData: FormData): Promise<FormState> => ({}));
    renderWithLocale(<GoalForm action={action} today="2026-11-01" defaultName="My goal" />);

    expect(screen.getByRole('button', { name: 'Between two dates' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('link', { name: 'Cancel' })).toHaveAttribute('href', '/write');
    await userEvent.click(screen.getByRole('button', { name: 'Create goal' }));

    expect(submitted(action)).toEqual({
      name: 'My goal',
      target: '50000',
      unit: 'words',
      period: '',
      startDate: '2026-11-01',
      endDate: '2026-11-30',
    });
  });

  it('saves a repeating goal for a year from its start', async () => {
    const action = vi.fn(async (_state: FormState, _formData: FormData): Promise<FormState> => ({}));
    renderWithLocale(
      <GoalForm action={action} today="2026-11-15" defaultName="Ignored" goal={existing} cancelHref="/write/goals" />,
    );

    expect(screen.getByRole('button', { name: 'Every month' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByLabelText('Starts on')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Cancel' })).toHaveAttribute('href', '/write/goals');
    await userEvent.click(screen.getByRole('button', { name: 'Every day' }));
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(submitted(action)).toMatchObject({
      name: 'Every month',
      target: '30',
      unit: 'pages',
      period: 'daily',
      startDate: '2026-11-01',
      endDate: '2027-11-01',
    });
  });

  it('shows the dates again for a goal without a period', async () => {
    const action = async (): Promise<FormState> => ({});
    renderWithLocale(
      <GoalForm action={action} today="2026-11-15" defaultName="Ignored" goal={{ ...existing, period: null }} />,
    );

    expect(screen.getByRole('button', { name: 'Between two dates' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByLabelText('Starts on')).toHaveValue('2026-11-01');
    expect(screen.getByLabelText('Ends on')).toHaveValue('2026-11-30');
  });

  it('keeps the typed values and shows the errors returned', async () => {
    const action = async (): Promise<FormState> => ({
      error: 'Something went wrong. Try again.',
      fieldErrors: { name: 'Enter a name up to 80 characters.' },
      values: {
        name: '',
        unit: 'hours',
        target: '12',
        startDate: '2026-12-01',
        endDate: '2026-12-10',
        period: '',
      },
    });
    renderWithLocale(<GoalForm action={action} today="2026-11-01" defaultName="My goal" />);

    await userEvent.clear(screen.getByLabelText('Target'));
    await userEvent.type(screen.getByLabelText('Target'), '12');
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Counted in' }), 'hours');
    await userEvent.click(screen.getByRole('button', { name: 'Create goal' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Something went wrong. Try again.');
    expect(screen.getByLabelText('Goal name')).toHaveAccessibleDescription('Enter a name up to 80 characters.');
    expect(screen.getByLabelText('Target')).toHaveValue('12');
    expect(screen.getByRole('combobox', { name: 'Counted in' })).toHaveValue('hours');
    expect(screen.getByLabelText('Starts on')).toHaveValue('2026-12-01');
    expect(screen.getByLabelText('Target')).not.toHaveAttribute('aria-invalid');
  });

  it('calls onDone once saved and when cancelled', async () => {
    const onDone = vi.fn();
    const action = async (): Promise<FormState> => ({ saved: true });
    renderWithLocale(<GoalForm action={action} today="2026-11-01" defaultName="My goal" onDone={onDone} />);

    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onDone).toHaveBeenCalledTimes(1);
    await userEvent.click(screen.getByRole('button', { name: 'Create goal' }));

    await vi.waitFor(() => expect(onDone).toHaveBeenCalledTimes(2));
  });

  it('saves without onDone', async () => {
    const action = vi.fn(async (): Promise<FormState> => ({ saved: true }));
    renderWithLocale(<GoalForm action={action} today="2026-11-01" defaultName="My goal" />);

    await userEvent.click(screen.getByRole('button', { name: 'Create goal' }));

    await vi.waitFor(() => expect(action).toHaveBeenCalledTimes(1));
    expect(await screen.findByRole('button', { name: 'Create goal' })).toBeEnabled();
  });
});
