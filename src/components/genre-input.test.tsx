import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithLocale } from '@/test/render';
import { GenreInput } from './genre-input';

const hiddenValue = (container: HTMLElement): string | undefined =>
  container.querySelector<HTMLInputElement>('input[name="genres"]')?.value;

describe('GenreInput', () => {
  it('adds genres with Enter, comma and blur without duplicates, and removes them', async () => {
    const { container } = renderWithLocale(<GenreInput defaultValue="Fantasy, Horror, Fantasy, " />);
    const input = screen.getByLabelText('Genres');

    expect(hiddenValue(container)).toBe('Fantasy, Horror');
    expect(input).toHaveAccessibleDescription('Press Enter after each genre. Up to 10.');

    await userEvent.type(input, 'Romance{Enter}Mystery,Horror{Enter}');

    expect(hiddenValue(container)).toBe('Fantasy, Horror, Romance, Mystery');

    await userEvent.type(input, '{Enter}');
    await userEvent.type(input, 'Drama');
    await userEvent.tab();

    expect(hiddenValue(container)).toBe('Fantasy, Horror, Romance, Mystery, Drama');

    await userEvent.click(input);
    await userEvent.tab();
    await userEvent.click(screen.getByRole('button', { name: 'Remove genre Horror' }));

    expect(hiddenValue(container)).toBe('Fantasy, Romance, Mystery, Drama');

    await userEvent.type(input, '{Backspace}');

    expect(hiddenValue(container)).toBe('Fantasy, Romance, Mystery');

    await userEvent.type(input, 'x{Backspace}');

    expect(hiddenValue(container)).toBe('Fantasy, Romance, Mystery');
  });

  it('does nothing on Backspace when there are no genres', async () => {
    const { container } = renderWithLocale(<GenreInput defaultValue="" />);

    await userEvent.type(screen.getByLabelText('Genres'), '{Backspace}');

    expect(hiddenValue(container)).toBe('');
  });

  it('stops at ten genres and shows the error', async () => {
    const genres = Array.from({ length: 9 }, (_, index) => `G${index}`).join(',');
    const { container } = renderWithLocale(<GenreInput defaultValue={genres} error="Pick up to 10 genres." />);
    const input = screen.getByLabelText('Genres');

    await userEvent.type(input, 'Last,Extra{Enter}');

    expect(hiddenValue(container)?.split(', ')).toHaveLength(10);

    expect(input).toBeDisabled();
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAccessibleDescription('Press Enter after each genre. Up to 10. Pick up to 10 genres.');
    expect(screen.queryByRole('button', { name: 'Remove genre Extra' })).not.toBeInTheDocument();
  });
});
