import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithLocale } from '@/test/render';
import Dialogue from './dialogue';

describe('Dialogue', () => {
  it('shows the share of dialogue and narration with a bar', async () => {
    const user = userEvent.setup();
    renderWithLocale(<Dialogue />);
    const field = await screen.findByLabelText('Your passage');
    await vi.waitFor(() => expect(field).toBeEnabled());
    await user.click(field);
    await user.paste('— Oi — disse ela.\nEle saiu sem responder.');

    expect(await screen.findByRole('img', { name: '14% dialogue, 86% narration' })).toBeInTheDocument();
    expect(screen.getByText('Dialogue 14%')).toBeInTheDocument();
    expect(screen.getByText('Narration 86%')).toBeInTheDocument();
    expect(screen.getByText('Words of narration').previousSibling).toHaveTextContent('6');
  });
});
