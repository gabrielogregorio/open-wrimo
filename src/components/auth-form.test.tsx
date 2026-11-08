import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { FormState } from '@/lib/form';
import { renderWithLocale } from '@/test/render';
import { AuthForm } from './auth-form';

describe('AuthForm', () => {
  it('signs in with the typed values and the return path', async () => {
    const action = vi.fn(async (_state: FormState, _formData: FormData): Promise<FormState> => ({}));
    renderWithLocale(<AuthForm mode="sign-in" action={action} next="/shelf/abc" />);

    await userEvent.type(screen.getByLabelText('Email'), 'ana@example.com');
    await userEvent.type(screen.getByLabelText('Password'), 'a long enough secret');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    const formData = action.mock.calls[0][1];

    expect(Object.fromEntries(formData)).toEqual({
      next: '/shelf/abc',
      email: 'ana@example.com',
      password: 'a long enough secret',
    });
    expect(screen.getByRole('link', { name: 'Create account' })).toHaveAttribute('href', '/register');
  });

  it('shows the rate limit message with the wait in Portuguese', async () => {
    const action = async (): Promise<FormState> => ({
      error: 'Too many attempts. Try again in {minutes} minutes.',
      errorValues: { minutes: 15 },
      values: { email: 'ana@example.com' },
    });
    renderWithLocale(<AuthForm mode="sign-in" action={action} />, 'pt-BR');

    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Muitas tentativas. Tente de novo em 15 minutos.');
    expect(screen.getByLabelText('E-mail')).toHaveValue('ana@example.com');
  });

  it('asks for a name on sign up and shows field errors', async () => {
    const action = async (): Promise<FormState> => ({
      fieldErrors: { name: 'Enter a name up to 80 characters.', password: 'Use 10 to 128 characters.' },
    });
    renderWithLocale(<AuthForm mode="sign-up" action={action} />);

    expect(screen.getByLabelText('Password')).toHaveAccessibleDescription('At least 10 characters.');
    await userEvent.click(screen.getByRole('button', { name: 'Create account' }));

    expect(await screen.findByLabelText('Name')).toHaveAccessibleDescription('Enter a name up to 80 characters.');
    expect(screen.getByLabelText('Password')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/login');
  });

  it('asks to accept the terms on sign up, links them and keeps the choice after an error', async () => {
    const action = vi.fn(async (_state: FormState, formData: FormData): Promise<FormState> => ({
      fieldErrors: formData.get('acceptTerms')
        ? { email: 'This email is already registered.' }
        : { acceptTerms: 'Accept the Terms of Use and Privacy Policy to create an account.' },
      values: { acceptTerms: String(formData.get('acceptTerms') ?? '') },
    }));
    renderWithLocale(<AuthForm mode="sign-up" action={action} />);
    const terms = screen.getByRole('checkbox', { name: /I have read and accept the/ });

    expect(terms).not.toBeChecked();
    expect(screen.getByRole('link', { name: 'Terms of Use and Privacy Policy' })).toHaveAttribute('href', '/termos');

    await userEvent.click(screen.getByRole('button', { name: 'Create account' }));

    expect(
      await screen.findByText('Accept the Terms of Use and Privacy Policy to create an account.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /I have read and accept the/ })).toHaveAttribute(
      'aria-invalid',
      'true',
    );

    await userEvent.click(screen.getByRole('checkbox', { name: /I have read and accept the/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Create account' }));

    expect(await screen.findByText('This email is already registered.')).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /I have read and accept the/ })).toBeChecked();
    expect(action.mock.calls[1][1].get('acceptTerms')).toBe('on');
  });
});
