import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithLocale } from '@/test/render';
import Names from './names';
import { steppingRandom, storyData } from './story/fixtures';

describe('Names', () => {
  it('generates names by era, region and gender and saves favorites', async () => {
    const user = userEvent.setup();
    renderWithLocale(<Names data={storyData} random={steppingRandom()} />);

    expect(await screen.findByText('Tap the star next to a name to keep it here.')).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText('Era'), 'Fantasy');
    await user.selectOptions(screen.getByLabelText('Region'), 'Japanese');
    await user.selectOptions(screen.getByLabelText('Gender'), 'Female');
    await user.click(screen.getByRole('button', { name: 'Generate 10 names' }));

    const stars = screen.getAllByRole('button', { name: /^Save / });
    expect(stars).toHaveLength(10);
    const name = (stars[0].getAttribute('aria-label') as string).replace('Save ', '');

    await user.click(stars[0]);
    expect(stars[0]).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: `Remove ${name}` })).toBeInTheDocument();

    await user.click(stars[0]);
    expect(screen.queryByRole('button', { name: `Remove ${name}` })).not.toBeInTheDocument();

    await user.click(stars[1]);
    await user.click(screen.getByRole('button', { name: /^Remove / }));
    expect(screen.getByText('Tap the star next to a name to keep it here.')).toBeInTheDocument();
  });

  it('uses Math.random by default', async () => {
    const user = userEvent.setup();
    renderWithLocale(<Names data={storyData} />);
    await user.click(screen.getByRole('button', { name: 'Generate 10 names' }));

    expect(screen.getAllByRole('button', { name: /^Save / }).length).toBeGreaterThan(0);
  });
});
