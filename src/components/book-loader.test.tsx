import { render, screen } from '@testing-library/react';
import { BookLoader } from './book-loader';

describe('BookLoader', () => {
  it('announces the wait with its label and draws lines being written', () => {
    const { container } = render(<BookLoader label="Turning the pages…" />);

    expect(screen.getByRole('status')).toHaveTextContent('Turning the pages…');
    expect(container.querySelectorAll('.ink-line')).toHaveLength(4);
    expect(container.querySelector('.turning-leaf')).toBeInTheDocument();
  });
});
