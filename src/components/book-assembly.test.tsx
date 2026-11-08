import { render } from '@testing-library/react';

// The book is only assembled on the first page after a load, so each test gets a fresh module.
const loadBookAssembly = async () => {
  vi.resetModules();

  return (await import('./book-assembly')).BookAssembly;
};

describe('BookAssembly', () => {
  it('builds a book from spine, leaves and cover, hidden from screen readers', async () => {
    const BookAssembly = await loadBookAssembly();
    const { container } = render(<BookAssembly />);
    const overlay = container.firstElementChild;

    expect(overlay).toHaveAttribute('aria-hidden', 'true');
    expect(container.querySelector('.assembly-spine')).toBeInTheDocument();
    expect(container.querySelector('.assembly-cover')).toBeInTheDocument();
    expect(container.querySelectorAll('.assembly-leaf')).toHaveLength(4);
    expect(container.querySelectorAll('.assembly-title path')).toHaveLength(2);
  });

  it('staggers the leaves so they land one after the other', async () => {
    const BookAssembly = await loadBookAssembly();
    const { container } = render(<BookAssembly />);
    const delays = [...container.querySelectorAll<SVGElement>('.assembly-leaf')].map((leaf) =>
      leaf.style.getPropertyValue('--leaf'),
    );

    expect(delays).toEqual(['0', '1', '2', '3']);
  });

  it('is not assembled again on the pages that follow', async () => {
    const BookAssembly = await loadBookAssembly();
    render(<BookAssembly />).unmount();
    const { container } = render(<BookAssembly />);

    expect(container).toBeEmptyDOMElement();
  });
});
