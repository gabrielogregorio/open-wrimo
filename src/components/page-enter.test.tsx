import { render, screen } from '@testing-library/react';
import { PageEnter } from './page-enter';

const pathname = vi.hoisted(() => ({ current: '/write' }));

vi.mock('next/navigation', () => ({ usePathname: () => pathname.current }));

const turnOf = (path: string): string | null => {
  pathname.current = path;
  const { unmount } = render(<PageEnter>page at {path}</PageEnter>);
  const turn = screen.getByText(`page at ${path}`).getAttribute('data-turn');
  unmount();

  return turn;
};

describe('PageEnter', () => {
  it('turns the page forward or back by where the new section sits', () => {
    expect(turnOf('/write')).toBe('none');
    expect(turnOf('/write/profile')).toBe('forward');
    expect(turnOf('/write/community')).toBe('back');
    expect(turnOf('/write/community')).toBe('within');
  });

  it('plays the entrance again when the address changes inside one section', () => {
    pathname.current = '/write/novels/a';
    const { rerender } = render(<PageEnter>novel page</PageEnter>);
    pathname.current = '/write/novels/a/edit';
    rerender(<PageEnter>novel page</PageEnter>);

    expect(screen.getByText('novel page')).toHaveAttribute('data-turn', 'within');
  });
});
