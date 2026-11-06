import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { renderWithLocale } from '@/test/render';
import { CoverShelf, type ShelfBook } from './cover-shelf';

const books: ShelfBook[] = ['One', 'Two', 'Three', 'Four', 'Five', 'Six'].map((title, index) => ({
  projectId: `p${index}`,
  title,
  coverUrl: index === 0 ? '/media/one.webp' : null,
  statusLabel: 'Drafting',
}));

function Shelf({ onSelect }: { onSelect: (index: number) => void }) {
  const [selected, setSelected] = useState(1);

  return (
    <CoverShelf
      books={books}
      selected={selected}
      onSelect={(index) => {
        onSelect(index);
        setSelected(index);
      }}
    />
  );
}

describe('CoverShelf', () => {
  it('moves through the books with the arrows, the keyboard and a click', async () => {
    const onSelect = vi.fn();
    renderWithLocale(<Shelf onSelect={onSelect} />);
    const group = screen.getByRole('radiogroup', { name: 'Which book did you write in?' });

    expect(screen.getByRole('radio', { name: 'Two · Drafting' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('radio', { name: 'Six · Drafting' })).toHaveStyle({ opacity: '0' });

    await userEvent.click(screen.getByRole('button', { name: 'Previous book' }));

    expect(onSelect).toHaveBeenLastCalledWith(0);
    expect(screen.getByRole('button', { name: 'Previous book' })).toBeDisabled();

    group.focus();
    await userEvent.keyboard('{End}');

    expect(onSelect).toHaveBeenLastCalledWith(5);
    expect(screen.getByRole('button', { name: 'Next book' })).toBeDisabled();

    await userEvent.keyboard('{ArrowLeft}');

    expect(onSelect).toHaveBeenLastCalledWith(4);

    await userEvent.keyboard('{ArrowRight}{Home}');

    expect(onSelect).toHaveBeenLastCalledWith(0);

    await userEvent.keyboard('a');

    expect(onSelect).toHaveBeenCalledTimes(5);

    await userEvent.click(screen.getByRole('button', { name: 'Next book' }));
    await userEvent.click(screen.getByRole('radio', { name: 'Four · Drafting' }));

    expect(onSelect).toHaveBeenLastCalledWith(3);
    expect(screen.getByRole('radio', { name: 'Four · Drafting' })).toHaveAttribute('aria-checked', 'true');
  });

  it('renders an empty shelf without a selected title', () => {
    renderWithLocale(<CoverShelf books={[]} selected={0} onSelect={vi.fn()} />, 'pt-BR');

    expect(screen.queryAllByRole('radio')).toHaveLength(0);
  });
});
