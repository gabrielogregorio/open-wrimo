import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithLocale } from '@/test/render';
import { ConfirmDelete } from './confirm-delete';

describe('ConfirmDelete', () => {
  it('asks before deleting and lets the writer back out', async () => {
    const action = vi.fn(async () => undefined);
    renderWithLocale(
      <ConfirmDelete action={action} label="Delete novel" question="Delete it for good?" confirmLabel="Yes, delete" />,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Delete novel' }));

    expect(screen.getByText('Delete it for good?')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Keep it' }));

    expect(screen.queryByText('Delete it for good?')).not.toBeInTheDocument();
    expect(action).not.toHaveBeenCalled();
  });

  it('runs the action once confirmed', async () => {
    const action = vi.fn(async () => undefined);
    renderWithLocale(<ConfirmDelete action={action} label="Delete" question="Sure?" confirmLabel="Yes" />);

    await userEvent.click(screen.getByRole('button', { name: 'Delete' }));
    await userEvent.click(screen.getByRole('button', { name: 'Yes' }));

    await vi.waitFor(() => expect(action).toHaveBeenCalledTimes(1));
  });
});
