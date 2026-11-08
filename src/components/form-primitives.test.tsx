import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithLocale } from '@/test/render';
import { FormAlert } from './form-alert';
import { FormField } from './form-field';
import { useI18n } from './i18n-provider';
import { LogoMark } from './logo';
import { SubmitButton } from './submit-button';

describe('FormField', () => {
  it('links the label, the hint and the error to the input', () => {
    render(<FormField label="Email" name="email" hint="We never share it." error="Enter a valid email address." />);
    const input = screen.getByLabelText('Email');

    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAccessibleDescription('We never share it. Enter a valid email address.');
  });

  it('leaves a clean input without hint or error', () => {
    render(<FormField label="Title" name="title" />);
    const input = screen.getByLabelText('Title');

    expect(input).not.toHaveAttribute('aria-invalid');
    expect(input).not.toHaveAttribute('aria-describedby');
  });
});

describe('FormAlert', () => {
  it('announces a message', () => {
    render(<FormAlert message="Invalid email or password." />);

    expect(screen.getByRole('alert')).toHaveTextContent('Invalid email or password.');
  });

  it('renders nothing without a message', () => {
    const { container } = render(<FormAlert />);

    expect(container).toBeEmptyDOMElement();
  });
});

// A form action that only settles when the test calls finish, so the pending state can be seen.
const slowAction = () => {
  let settle: () => void = () => undefined;
  const action = () =>
    new Promise<void>((resolve) => {
      settle = resolve;
    });

  return { action, finish: () => settle() };
};

describe('SubmitButton', () => {
  it('turns into a disabled saving state while the form is sent', async () => {
    const { action, finish } = slowAction();
    renderWithLocale(
      <form action={action}>
        <SubmitButton variant="danger">Remove</SubmitButton>
      </form>,
      'pt-BR',
    );

    await userEvent.click(screen.getByRole('button', { name: 'Remove' }));

    expect(await screen.findByRole('button', { name: 'Salvando…' })).toBeDisabled();
    finish();
    expect(await screen.findByRole('button', { name: 'Remove' })).toBeEnabled();
  });

  it('says what it is doing when given a waiting label', async () => {
    const { action, finish } = slowAction();
    render(
      <form action={action}>
        <SubmitButton pendingLabel="Signing in…">Sign in</SubmitButton>
      </form>,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByRole('button', { name: 'Signing in…' })).toBeDisabled();
    finish();
    expect(await screen.findByRole('button', { name: 'Sign in' })).toBeEnabled();
  });
});

describe('I18nProvider', () => {
  function Greeting() {
    const { locale, t } = useI18n();

    return <p>{`${locale}: ${t('Sign in')}`}</p>;
  }

  it('falls back to English outside a provider', () => {
    render(<Greeting />);

    expect(screen.getByText('en-US: Sign in')).toBeInTheDocument();
  });

  it('gives the chosen locale to the tree', () => {
    renderWithLocale(<Greeting />, 'pt-BR');

    expect(screen.getByText('pt-BR: Entrar')).toBeInTheDocument();
  });
});

describe('LogoMark', () => {
  it('is hidden from assistive technology', () => {
    const { container } = render(<LogoMark />);

    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });
});
