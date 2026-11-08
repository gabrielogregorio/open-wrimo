import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithLocale } from '@/test/render';
import Repetition from './repetition';

describe('Repetition', () => {
  it('highlights words repeated in a paragraph and finds a tapped word everywhere', async () => {
    const user = userEvent.setup();
    renderWithLocale(<Repetition />);
    const field = await screen.findByLabelText('Your passage');
    await vi.waitFor(() => expect(field).toBeEnabled());
    await user.click(field);
    await user.paste('A casa, a casa e a casa.\nUma porta e outra porta.');

    expect(await screen.findByText('Paragraph 1: casa × 3')).toBeInTheDocument();

    const houses = screen.getAllByRole('button', { name: 'casa' });
    expect(houses).toHaveLength(3);
    expect(houses[0]).toHaveClass('bg-ribbon/20');
    expect(screen.getAllByRole('button', { name: 'porta' })[0]).not.toHaveClass('bg-ribbon/20');

    await user.click(houses[1]);
    expect(houses.every((house) => house.getAttribute('aria-pressed') === 'true')).toBe(true);
    await user.click(houses[2]);
    expect(houses[0]).toHaveAttribute('aria-pressed', 'false');

    await user.selectOptions(screen.getByLabelText('Highlight from (times in a paragraph)'), '2');
    const list = screen.getByRole('heading', { name: 'Repeated words by paragraph' }).nextElementSibling as HTMLElement;
    expect(within(list).getByText('Paragraph 2: porta × 2')).toBeInTheDocument();
  });
});
