import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IDEA_CHARACTERS } from '@/lib/tools/story/ideas';
import { renderWithLocale } from '@/test/render';
import Ideas from './ideas';
import { steppingRandom, storyData } from './story/fixtures';

describe('Ideas', () => {
  it('rolls an idea, rerolls its parts and saves it to the novel', async () => {
    const user = userEvent.setup();
    renderWithLocale(<Ideas data={storyData} random={steppingRandom()} />);

    expect(screen.getByText('Roll a character, a place and a conflict.')).toBeInTheDocument();
    expect(await screen.findByText('Ideas you save stay here, with the novel.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save idea' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Roll an idea' }));
    const character = () => IDEA_CHARACTERS.find((option) => screen.queryByText(option));
    const first = character();
    expect(first).toBeDefined();

    await user.click(screen.getByRole('button', { name: 'Reroll Character' }));
    expect(character()).not.toBe(first);
    await user.click(screen.getByRole('button', { name: 'Reroll all' }));
    await user.click(screen.getByRole('button', { name: 'Save idea' }));

    const saved = screen.getByText(new RegExp(`^${character()}, in `));
    expect(saved).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Delete' }));
    await user.click(screen.getByRole('button', { name: 'Yes, delete' }));
    expect(screen.getByText('Ideas you save stay here, with the novel.')).toBeInTheDocument();
  });

  it('uses Math.random by default', async () => {
    const user = userEvent.setup();
    renderWithLocale(<Ideas data={storyData} />);
    await user.click(screen.getByRole('button', { name: 'Roll an idea' }));

    expect(screen.getByRole('button', { name: 'Reroll all' })).toBeInTheDocument();
  });
});
