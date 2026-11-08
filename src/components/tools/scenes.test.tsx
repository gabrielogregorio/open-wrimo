import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithLocale } from '@/test/render';
import Scenes from './scenes';
import { storyData } from './story/fixtures';

const column = (name: string) => screen.getByRole('region', { name });

describe('Scenes', () => {
  it('adds scene cards and moves them across the columns', async () => {
    const user = userEvent.setup();
    renderWithLocale(<Scenes data={storyData} />);

    await user.type(await screen.findByLabelText('Scene'), 'Chegada');
    await user.type(screen.getByLabelText('Note'), 'Chove');
    await user.click(screen.getByRole('button', { name: 'Add to planned' }));

    await user.type(screen.getByLabelText('Scene'), 'Partida');
    await user.click(screen.getByRole('button', { name: 'Add to planned' }));

    expect(within(column('Planned')).getByText('Chegada')).toBeInTheDocument();
    expect(within(column('Planned')).getByText('Chove')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Planned (2)' })).toHaveAttribute('aria-selected', 'true');

    await user.click(within(column('Planned')).getAllByRole('button', { name: 'Written →' })[0]);
    expect(within(column('Written')).getByText('Chegada')).toBeInTheDocument();

    await user.click(within(column('Written')).getByRole('button', { name: 'Revised →' }));
    await user.click(within(column('Revised')).getByRole('button', { name: '← Written' }));
    await user.click(within(column('Written')).getByRole('button', { name: '← Planned' }));
    expect(within(column('Planned')).getByText('Chegada')).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: 'Written (0)' }));
    expect(screen.getByRole('tab', { name: 'Written (0)' })).toHaveAttribute('aria-selected', 'true');
    expect(column('Planned')).toHaveClass('hidden');

    await user.click(screen.getAllByRole('button', { name: 'Delete' })[0]);
    await user.click(screen.getByRole('button', { name: 'Yes, delete' }));
    expect(screen.queryByText('Chegada')).not.toBeInTheDocument();
    expect(screen.getByText('Partida')).toBeInTheDocument();
  });
});
