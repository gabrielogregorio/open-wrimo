import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithLocale } from '@/test/render';
import { noNovels } from './story/fixtures';
import Timeline from './timeline';

const titles = () => screen.getAllByRole('heading', { level: 3 }).map((heading) => heading.textContent);

describe('Timeline', () => {
  it('orders events by chapter and moves them with buttons', async () => {
    const user = userEvent.setup();
    renderWithLocale(<Timeline data={noNovels} />);
    expect(await screen.findByText('No events yet for this novel.')).toBeInTheDocument();

    const addEvent = async (title: string, chapter: string, note = '') => {
      await user.type(screen.getByLabelText('What happens'), title);
      await user.clear(screen.getByLabelText('Chapter'));
      await user.type(screen.getByLabelText('Chapter'), chapter);
      if (note) {
        await user.type(screen.getByLabelText('Note'), note);
      }
      await user.click(screen.getByRole('button', { name: 'Add event' }));
    };

    await addEvent('Fuga', '3', 'De noite');
    await addEvent('Começo', '1');
    await addEvent('Meio', '1');

    expect(titles()).toEqual(['Começo', 'Meio', 'Fuga']);
    expect(screen.getByText('De noite')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Move Começo up' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Move Fuga down' })).toBeDisabled();

    await user.click(screen.getByRole('button', { name: 'Move Fuga up' }));
    expect(titles()).toEqual(['Começo', 'Fuga', 'Meio']);
    expect(screen.queryByText('Chapter 3')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Move Começo down' }));
    expect(titles()).toEqual(['Fuga', 'Começo', 'Meio']);

    await user.click(screen.getAllByRole('button', { name: 'Edit' })[2]);
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    await user.click(screen.getAllByRole('button', { name: 'Edit' })[2]);
    const chapters = screen.getAllByLabelText('Chapter');
    await user.clear(chapters[1]);
    await user.type(chapters[1], '9');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(screen.getByText('Chapter 9')).toBeInTheDocument();

    await user.clear(screen.getByLabelText('Chapter'));
    await user.type(screen.getByLabelText('What happens'), 'Sem número');
    await user.click(screen.getByRole('button', { name: 'Add event' }));
    expect(titles()).toEqual(['Fuga', 'Começo', 'Sem número', 'Meio']);

    await user.click(screen.getAllByRole('button', { name: 'Delete' })[0]);
    await user.click(screen.getByRole('button', { name: 'Yes, delete' }));
    expect(titles()).toEqual(['Começo', 'Sem número', 'Meio']);
  });
});
