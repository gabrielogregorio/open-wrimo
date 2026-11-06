import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UsernameInput, toUsername } from './username-input';

describe('toUsername', () => {
  it('drops accents, lowercases, joins words with dashes and trims leading dashes', () => {
    expect(toUsername('--Ána Lú!!')).toBe('ana-lu-');
    expect(toUsername('a'.repeat(30))).toHaveLength(20);
  });
});

describe('UsernameInput', () => {
  it('cleans what the writer types and trims trailing dashes on blur', async () => {
    render(<UsernameInput label="Username" hint="Your address" defaultValue="Zé Silva" />);
    const input = screen.getByLabelText('Username');

    expect(input).toHaveValue('ze-silva');
    expect(input).toHaveAccessibleDescription('Your address');

    await userEvent.clear(input);
    await userEvent.type(input, 'Maria Clara!');

    expect(input).toHaveValue('maria-clara-');

    await userEvent.tab();

    expect(input).toHaveValue('maria-clara');
  });

  it('starts empty, keeps an empty value on blur and shows the error', () => {
    render(<UsernameInput label="Username" hint="Hint" error="Taken." />);
    const input = screen.getByLabelText('Username');

    fireEvent.blur(input);

    expect(input).toHaveValue('');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText('Taken.')).toBeInTheDocument();
  });
});
