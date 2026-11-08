import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConfirmedSubmit } from './confirmed-submit';

describe('ConfirmedSubmit', () => {
  it('keeps the button off until the box is ticked, and off again when it is cleared', async () => {
    const user = userEvent.setup();
    render(
      <form>
        <ConfirmedSubmit confirmLabel="I understand." pendingLabel="Deleting…">
          Delete my account
        </ConfirmedSubmit>
      </form>,
    );
    const button = screen.getByRole('button', { name: 'Delete my account' });

    expect(button).toBeDisabled();
    await user.click(screen.getByRole('checkbox', { name: 'I understand.' }));
    expect(button).toBeEnabled();
    await user.click(screen.getByRole('checkbox', { name: 'I understand.' }));
    expect(button).toBeDisabled();
  });

  it('sends the box as confirm and shows the error the server gave', () => {
    render(
      <ConfirmedSubmit confirmLabel="I understand." error="Tick the box to confirm." pendingLabel="Deleting…">
        Delete my account
      </ConfirmedSubmit>,
    );
    const box = screen.getByRole('checkbox', { name: 'I understand.' });

    expect(box).toHaveAttribute('name', 'confirm');
    expect(box).toHaveAttribute('aria-invalid', 'true');
    expect(box).toHaveAccessibleDescription('Tick the box to confirm.');
  });
});
