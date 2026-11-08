import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RARE_TWISTS, TWISTS } from '@/lib/tools/story/plot-dice';
import { renderWithLocale } from '@/test/render';
import PlotDice from './plot-dice';
import { noNovels, steppingRandom } from './story/fixtures';

describe('PlotDice', () => {
  it('rolls twists and keeps the last rolls', async () => {
    const user = userEvent.setup();
    renderWithLocale(<PlotDice data={noNovels} random={steppingRandom()} />);

    expect(await screen.findByText('What happens now?')).toBeInTheDocument();
    expect(screen.getByText('⚀')).toBeInTheDocument();
    expect(screen.queryByText('Last rolls')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Roll the die' }));
    expect(screen.queryByText('What happens now?')).not.toBeInTheDocument();
    expect(TWISTS.some((twist) => screen.queryByText(twist))).toBe(true);

    for (let roll = 0; roll < 11; roll += 1) {
      await user.click(screen.getByRole('button', { name: 'Roll the die' }));
    }

    expect(screen.getByText('Last rolls')).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(9);
  });

  it('marks a rare twist on the die and in the last rolls', async () => {
    const user = userEvent.setup();
    renderWithLocale(<PlotDice data={noNovels} random={() => 0.99} />);

    await user.click(await screen.findByRole('button', { name: 'Roll the die' }));
    expect(screen.getByText('Rare twist')).toBeInTheDocument();
    expect(screen.getByText(RARE_TWISTS.at(-1)!)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Roll the die' }));
    expect(screen.getByText('(rare)')).toBeInTheDocument();
  });

  it('uses Math.random by default', async () => {
    const user = userEvent.setup();
    renderWithLocale(<PlotDice data={noNovels} />);
    await user.click(await screen.findByRole('button', { name: 'Roll the die' }));

    expect(screen.queryByText('What happens now?')).not.toBeInTheDocument();
  });
});
