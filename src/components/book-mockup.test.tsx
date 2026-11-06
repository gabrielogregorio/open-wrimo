import { createEvent, fireEvent, render, screen } from '@testing-library/react';
import { BookMockup } from './book-mockup';

const stubReducedMotion = (reduce: boolean): void => {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({ matches: reduce, media: query })),
  );
};

const renderBook = (tilted?: boolean): HTMLElement => {
  const { container } = render(<BookMockup title="Dune" coverUrl={null} tilted={tilted} />);
  const book = container.firstElementChild as HTMLElement;
  book.getBoundingClientRect = () => ({ left: 0, top: 0, width: 200, height: 100 }) as DOMRect;

  return book;
};

describe('BookMockup', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('turns toward the pointer and rests when it leaves', () => {
    stubReducedMotion(false);
    const book = renderBook();

    fireEvent.pointerMove(book, { clientX: 200, clientY: 0 });

    expect(book.style.getPropertyValue('--turn-y')).toBe('-8deg');
    expect(book.style.getPropertyValue('--turn-x')).toBe('6deg');

    fireEvent.pointerMove(book, { clientX: -50, clientY: 500 });

    expect(book.style.getPropertyValue('--turn-y')).toBe('-38deg');
    expect(book.style.getPropertyValue('--turn-x')).toBe('-6deg');

    fireEvent.pointerLeave(book);

    expect(book.style.getPropertyValue('--turn-y')).toBe('');
    expect(book.style.getPropertyValue('--turn-x')).toBe('');
    expect(screen.getByText('Dune')).toBeInTheDocument();
  });

  it('stays still when the reader prefers reduced motion', () => {
    stubReducedMotion(true);
    const book = renderBook();

    fireEvent.pointerMove(book, { clientX: 100, clientY: 50 });

    expect(book.style.getPropertyValue('--turn-y')).toBe('');
  });

  it('lies flat without pointer tracking and blocks dragging', () => {
    stubReducedMotion(false);
    const book = renderBook(false);

    fireEvent.pointerMove(book, { clientX: 100, clientY: 50 });
    const drag = createEvent.dragStart(book);
    fireEvent(book, drag);

    expect(book).toHaveClass('is-flat');
    expect(book.style.getPropertyValue('--turn-y')).toBe('');
    expect(drag.defaultPrevented).toBe(true);
  });

  it('shows the cover image when there is one', () => {
    const { container } = render(<BookMockup title="Dune" coverUrl="/media/cover.webp" />);

    expect(container.querySelector('img')).toHaveAttribute('src', '/media/cover.webp');
    expect(screen.queryByText('Dune')).not.toBeInTheDocument();
  });
});
