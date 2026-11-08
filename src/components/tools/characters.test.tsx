import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithLocale } from '@/test/render';
import Characters from './characters';
import { storyData } from './story/fixtures';

describe('Characters', () => {
  it('adds, edits and deletes character sheets per novel', async () => {
    const user = userEvent.setup();
    renderWithLocale(<Characters data={storyData} />);

    expect(await screen.findByText('No characters yet for this novel.')).toBeInTheDocument();
    const add = screen.getByRole('button', { name: 'Add character' });
    expect(add).toBeDisabled();

    await user.type(screen.getByLabelText('Name'), 'Lia');
    await user.type(screen.getByLabelText('What they want'), 'Achar o pai');
    await user.click(add);

    expect(screen.getByRole('heading', { name: 'Lia' })).toBeInTheDocument();
    expect(screen.getByText('Achar o pai')).toBeInTheDocument();
    expect(screen.getAllByText('Fear')).toHaveLength(1);
    expect(screen.getByLabelText('Name')).toHaveValue('');

    await user.type(screen.getByLabelText('Name'), 'Davi');
    await user.click(add);

    await user.click(screen.getAllByRole('button', { name: 'Edit' })[0]);
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    await user.click(screen.getAllByRole('button', { name: 'Edit' })[0]);
    const roles = screen.getAllByLabelText('Role in the story');
    await user.type(roles[1], 'Protagonista');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(screen.getByText('Protagonista')).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText('Novel'), 'No novel (loose notes)');
    expect(await screen.findByText('No characters yet for this novel.')).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText('Novel'), 'A casa do rio');
    expect(await screen.findByRole('heading', { name: 'Lia' })).toBeInTheDocument();

    await user.click(screen.getAllByRole('button', { name: 'Delete' })[0]);
    await user.click(screen.getByRole('button', { name: 'Keep it' }));
    await user.click(screen.getAllByRole('button', { name: 'Delete' })[0]);
    expect(screen.getByRole('group', { name: 'Delete Lia?' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Yes, delete' }));

    expect(screen.queryByRole('heading', { name: 'Lia' })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Davi' })).toBeInTheDocument();
  });
});
