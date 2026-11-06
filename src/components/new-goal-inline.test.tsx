import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { FormState } from '@/lib/form';
import { renderWithLocale } from '@/test/render';
import { NewGoalInline } from './new-goal-inline';

describe('NewGoalInline', () => {
  it('opens the goal form and closes it on cancel', async () => {
    const action = async (): Promise<FormState> => ({});
    renderWithLocale(<NewGoalInline action={action} today="2026-11-01" defaultName="My goal" />);

    await userEvent.click(screen.getByRole('button', { name: 'New goal' }));

    expect(screen.getByLabelText('Goal name')).toHaveValue('My goal');
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(screen.queryByLabelText('Goal name')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'New goal' })).toBeInTheDocument();
  });

  it('closes after the goal is saved', async () => {
    const action = async (): Promise<FormState> => ({ saved: true });
    renderWithLocale(<NewGoalInline action={action} today="2026-11-01" defaultName="My goal" />);

    await userEvent.click(screen.getByRole('button', { name: 'New goal' }));
    await userEvent.click(screen.getByRole('button', { name: 'Create goal' }));

    expect(await screen.findByRole('button', { name: 'New goal' })).toBeInTheDocument();
  });
});
