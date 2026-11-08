import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithLocale } from '@/test/render';
import Readability from './readability';

const write = async (text: string) => {
  const user = userEvent.setup();
  const field = await screen.findByLabelText('Your passage');
  await vi.waitFor(() => expect(field).toBeEnabled());
  await user.clear(field);
  await user.paste(text);
};

describe('Readability', () => {
  it('shows the score, its band and what it means', async () => {
    renderWithLocale(<Readability />);
    await write('O gato bebe leite. A casa é azul.');

    expect(await screen.findByText('Very easy')).toBeInTheDocument();
    expect(screen.getByText('100')).toBeInTheDocument();
    expect(screen.getByText(/children’s book/)).toBeInTheDocument();
    expect(screen.getByText('Syllables').previousSibling).toHaveTextContent('13');
  });

  it('has no score for punctuation only', async () => {
    renderWithLocale(<Readability />);
    await write('… !');

    expect(await screen.findByText('Paste a passage to see the analysis.')).toBeInTheDocument();
    expect(screen.queryByText('Syllables')).not.toBeInTheDocument();
  });
});
