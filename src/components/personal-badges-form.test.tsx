import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { FormState } from '@/lib/form';
import { renderWithLocale } from '@/test/render';
import { PersonalBadgesForm } from './personal-badges-form';

describe('PersonalBadgesForm', () => {
  it('checks the awarded badges and sends the chosen ones', async () => {
    const action = vi.fn(async (_state: FormState, _formData: FormData): Promise<FormState> => ({ saved: true }));
    renderWithLocale(<PersonalBadgesForm action={action} awarded={['back-it-up']} />);

    const backup = screen.getByRole('checkbox', { name: /Back it up/ });
    const wellness = screen.getByRole('checkbox', { name: /Writer wellness/ });

    expect(backup).toBeChecked();
    expect(wellness).not.toBeChecked();
    expect(screen.getByRole('status')).toHaveTextContent('');

    await userEvent.click(wellness);
    await userEvent.click(screen.getByRole('button', { name: 'Save badges' }));

    expect(await screen.findByText('Badges saved.')).toBeInTheDocument();
    expect(action.mock.calls[0][1].getAll('badge')).toEqual(['back-it-up', 'writer-wellness']);
  });
});
