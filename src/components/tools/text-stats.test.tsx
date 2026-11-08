import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithLocale } from '@/test/render';
import TextStats from './text-stats';

const paste = async (text: string) => {
  const user = userEvent.setup();
  const field = await screen.findByLabelText('Your passage');
  await vi.waitFor(() => expect(field).toBeEnabled());
  await user.click(field);
  await user.paste(text);

  return user;
};

describe('TextStats', () => {
  it('asks for a passage while the field is empty', async () => {
    renderWithLocale(<TextStats />);

    expect(await screen.findByText('Paste a passage to see the analysis.')).toBeInTheDocument();
    expect(await screen.findByLabelText('Your passage')).toBeEnabled();
  });

  it('shows counts, repeated words, long sentences and adverbs, and keeps the text after a reload', async () => {
    const { unmount } = renderWithLocale(<TextStats />);
    const user = await paste('Ela correu rapidamente para casa. A casa estava fria e escura demais.\nFim.');

    expect(await screen.findByText('Most repeated words')).toBeInTheDocument();
    expect(screen.getByText('Sentences').previousSibling).toHaveTextContent('3');
    expect(screen.getByText('Paragraphs').previousSibling).toHaveTextContent('2');
    expect(screen.getByText('Adverbs ending in -mente: 1')).toBeInTheDocument();
    expect(screen.getByText('Sentences over 35 words: 0')).toBeInTheDocument();

    const limit = screen.getByLabelText('Long sentence above (words)');
    await user.clear(limit);
    await user.type(limit, '5');

    expect(screen.getByText('Sentences over 5 words: 1')).toBeInTheDocument();
    await user.clear(limit);
    expect(screen.getByText('Sentences over 35 words: 0')).toBeInTheDocument();
    await user.type(limit, '5');
    expect(screen.getAllByText('(7 words)')).toHaveLength(1);

    unmount();
    renderWithLocale(<TextStats />);

    expect(await screen.findByDisplayValue(/Ela correu rapidamente/)).toBeInTheDocument();
  });

  it('says when no word repeats', async () => {
    renderWithLocale(<TextStats />);
    const field = await screen.findByLabelText('Your passage');
    await vi.waitFor(() => expect(field).toBeEnabled());
    const user = userEvent.setup();
    await user.clear(field);
    await user.paste('Um texto curto.');

    expect(await screen.findByText('No word repeats yet.')).toBeInTheDocument();
  });
});
