import { render } from '@testing-library/react';
import { BookAssembly } from './book-assembly';

describe('BookAssembly', () => {
  it('builds a book from spine, leaves and cover, hidden from screen readers', () => {
    const { container } = render(<BookAssembly />);
    const overlay = container.firstElementChild;

    expect(overlay).toHaveAttribute('aria-hidden', 'true');
    expect(container.querySelector('.assembly-spine')).toBeInTheDocument();
    expect(container.querySelector('.assembly-cover')).toBeInTheDocument();
    expect(container.querySelectorAll('.assembly-leaf')).toHaveLength(4);
    expect(container.querySelectorAll('.assembly-title path')).toHaveLength(2);
  });

  it('staggers the leaves so they land one after the other', () => {
    const { container } = render(<BookAssembly />);
    const delays = [...container.querySelectorAll<SVGElement>('.assembly-leaf')].map((leaf) =>
      leaf.style.getPropertyValue('--leaf'),
    );

    expect(delays).toEqual(['0', '1', '2', '3']);
  });
});
