import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { localDb } from '@/lib/tools/local-db';
import { IDEA_GENRES, IDEA_TROPES } from '@/lib/tools/story/idea-data';
import { IDEA_CHARACTERS, tropesFor } from '@/lib/tools/story/ideas';
import { storyKey } from '@/lib/tools/story/random';
import { renderWithLocale } from '@/test/render';
import Ideas from './ideas';
import { steppingRandom, storyData } from './story/fixtures';

const romance = IDEA_GENRES.find((genre) => genre.id === 'romance')!;
const romanceTropes = tropesFor({ genres: IDEA_GENRES, tropes: IDEA_TROPES }, 'romance');
const horrorOnly = IDEA_TROPES.find((trope) => trope.genres.length === 1 && trope.genres[0] === 'terror')!;
const allCharacters = [...IDEA_CHARACTERS, ...IDEA_GENRES.flatMap((genre) => genre.characters)];

describe('Ideas', () => {
  beforeEach(async () => {
    await localDb().remove(storyKey('novel-1', 'ideas'));
  });

  it('rolls an idea in the chosen genre with the wanted trope, rerolls its parts and saves it', async () => {
    const user = userEvent.setup();
    renderWithLocale(<Ideas data={storyData} random={steppingRandom()} />);

    expect(screen.getByText('Roll a genre, two tropes, a character, a place and a conflict.')).toBeInTheDocument();
    expect(await screen.findByText('Ideas you save stay here, with the novel.')).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText('Genre'), 'romance');
    await user.click(screen.getByRole('button', { name: romanceTropes[0].name }));
    expect(screen.getByRole('button', { name: romanceTropes[0].name })).toHaveAttribute('aria-pressed', 'true');

    await user.click(screen.getByRole('button', { name: 'Roll an idea' }));
    const card = screen.getByRole('button', { name: 'Reroll all' }).closest('section') as HTMLElement;
    expect(within(card).getByText(romance.name)).toBeInTheDocument();
    expect(within(card).getByText(romanceTropes[0].description)).toBeInTheDocument();

    const character = () => allCharacters.find((option) => within(card).queryByText(option));
    const first = character();
    await user.click(screen.getByRole('button', { name: 'Reroll Character' }));
    expect(character()).not.toBe(first);
    await user.click(screen.getByRole('button', { name: 'Reroll Tropes' }));
    expect(within(card).getByText(romanceTropes[0].name)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Reroll all' }));
    await user.click(screen.getByRole('button', { name: 'Save idea' }));

    expect(screen.getByText(new RegExp(`^${character()}, in `))).toBeInTheDocument();
    expect(screen.getAllByText(new RegExp(`^${romance.name} · `))).toHaveLength(1);

    await user.click(screen.getByRole('button', { name: 'Delete' }));
    await user.click(screen.getByRole('button', { name: 'Yes, delete' }));
    expect(screen.getByText('Ideas you save stay here, with the novel.')).toBeInTheDocument();
  });

  it('keeps up to three wanted tropes, drops the ones a new genre does not fit, and shows them all on request', async () => {
    const user = userEvent.setup();
    renderWithLocale(<Ideas data={storyData} random={steppingRandom()} />);

    await user.click(screen.getByRole('button', { name: /^See all \d+ tropes$/ }));
    await user.click(screen.getByRole('button', { name: horrorOnly.name }));
    for (const trope of romanceTropes.filter((item) => item.genres.length > 0).slice(0, 3)) {
      await user.click(screen.getByRole('button', { name: trope.name }));
    }
    expect(screen.getAllByRole('button', { pressed: true })).toHaveLength(3);
    await user.click(
      screen.getByRole('button', { name: romanceTropes.filter((item) => item.genres.length > 0)[0].name }),
    );
    expect(screen.getAllByRole('button', { pressed: true })).toHaveLength(2);

    await user.selectOptions(screen.getByLabelText('Genre'), 'terror');
    expect(screen.queryAllByRole('button', { pressed: true })).toHaveLength(0);
    await user.selectOptions(screen.getByLabelText('Genre'), 'dark-academia');
    expect(screen.queryByRole('button', { name: /^See all \d+ tropes$/ })).not.toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText('Genre'), '');
    await user.click(screen.getByRole('button', { name: 'Show fewer tropes' }));
    expect(screen.getByRole('button', { name: /^See all \d+ tropes$/ })).toBeInTheDocument();
  });

  it('shows ideas saved before genres existed, and uses Math.random by default', async () => {
    await localDb().set(storyKey('novel-1', 'ideas'), [
      { id: 'old', character: 'uma parteira', place: 'num farol', conflict: 'perde a memória' },
    ]);
    const user = userEvent.setup();
    renderWithLocale(<Ideas data={storyData} />);

    expect(await screen.findByText('uma parteira, in num farol, perde a memória.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Roll an idea' }));
    expect(screen.getByRole('button', { name: 'Reroll all' })).toBeInTheDocument();
  });
});
