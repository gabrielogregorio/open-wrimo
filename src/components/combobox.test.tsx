import { fireEvent, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { renderWithLocale } from '@/test/render';
import { Combobox, filterGroups, searchable, type ComboboxGroup } from './combobox';

const groups: ComboboxGroup[] = [
  {
    label: 'Idade Média',
    options: [
      { value: 'norse', label: 'Nórdica antiga' },
      { value: 'gaelic', label: 'Gaélica medieval' },
    ],
  },
  { label: 'Ásia', options: [{ value: 'edo', label: 'Japão Edo' }] },
];

function Picker({ initial = 'norse' }: { initial?: string }) {
  const [value, setValue] = useState(initial);

  return (
    <>
      <Combobox label="Coleção" groups={groups} value={value} onChange={setValue} />
      <p data-testid="chosen">{value}</p>
    </>
  );
}

const box = () => screen.getByRole('combobox', { name: 'Coleção' });

describe('filterGroups', () => {
  it('matches labels and group names without case or accents', () => {
    expect(searchable('  Nórdica ')).toBe('nordica');
    expect(filterGroups(groups, 'nordica').map((group) => group.options.map((option) => option.value))).toEqual([
      ['norse'],
    ]);
    expect(filterGroups(groups, 'asia')[0].options).toHaveLength(1);
    expect(filterGroups(groups, '')).toHaveLength(2);
    expect(filterGroups(groups, 'zzz')).toEqual([]);
  });
});

describe('Combobox', () => {
  it('shows the choice, opens like a select and picks with a click', async () => {
    renderWithLocale(<Picker />);

    expect(box()).toHaveValue('Nórdica antiga');
    expect(box()).toHaveAttribute('aria-expanded', 'false');

    await userEvent.click(box());

    expect(box()).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('option', { name: 'Nórdica antiga' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('group', { name: 'Ásia' })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('option', { name: 'Japão Edo' }));

    expect(screen.getByTestId('chosen')).toHaveTextContent('edo');
    expect(box()).toHaveValue('Japão Edo');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('filters as you type and moves with the keyboard', async () => {
    renderWithLocale(<Picker />);

    await userEvent.type(box(), 'medieval');

    expect(screen.getAllByRole('option')).toHaveLength(1);
    await userEvent.clear(box());
    await userEvent.type(box(), 'zzz');
    expect(screen.getByText('Nothing found.')).toBeInTheDocument();
    await userEvent.keyboard('{Enter}');
    await userEvent.clear(box());
    await userEvent.keyboard('{ArrowDown}{ArrowDown}');

    expect(box()).toHaveAttribute('aria-activedescendant', expect.stringMatching(/option-2$/));

    await userEvent.keyboard('{ArrowUp}{End}{Home}{ArrowDown}{Enter}');

    expect(screen.getByTestId('chosen')).toHaveTextContent('gaelic');
  });

  it('closes on Escape or blur and keeps the old choice, and opens from the keyboard or the arrow button', async () => {
    renderWithLocale(<Picker initial="gone" />);

    expect(box()).toHaveValue('');
    await userEvent.click(box());
    await userEvent.click(box());
    await userEvent.keyboard('{Escape}');
    expect(box()).toHaveAttribute('aria-expanded', 'false');
    await userEvent.keyboard('{ArrowUp}');
    expect(box()).toHaveAttribute('aria-expanded', 'true');
    await userEvent.keyboard('{Escape}{ArrowDown}');
    expect(box()).toHaveAttribute('aria-expanded', 'true');
    await userEvent.keyboard('{Escape}{Enter}');
    expect(box()).toHaveAttribute('aria-expanded', 'true');
    fireEvent.mouseEnter(screen.getByRole('option', { name: 'Japão Edo' }));
    expect(box()).toHaveAttribute('aria-activedescendant', expect.stringMatching(/option-2$/));
    fireEvent.blur(box());
    expect(box()).toHaveAttribute('aria-expanded', 'false');

    await userEvent.click(screen.getByRole('button', { name: 'Open the list' }));
    expect(box()).toHaveFocus();
    await userEvent.click(screen.getByRole('button', { name: 'Close the list' }));
    expect(box()).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByTestId('chosen')).toHaveTextContent('gone');
    await userEvent.keyboard('{Tab}');
    await userEvent.keyboard('{Home}{End}');
  });
});
