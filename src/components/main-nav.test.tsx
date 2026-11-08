import { render, screen } from '@testing-library/react';
import { MainNav } from './main-nav';

const pathname = vi.hoisted(() => ({ current: '/write' }));

vi.mock('next/navigation', () => ({ usePathname: () => pathname.current }));

const renderNav = () =>
  render(
    <MainNav
      label="Main"
      writing="Writing"
      tools="Tools"
      community="Community"
      profile="Profile"
      update="Update my word count"
      sprint="Writing sprint"
    />,
  );

describe('MainNav', () => {
  it('marks the section of the current page, including pages inside it', () => {
    pathname.current = '/write/novels/abc/edit';
    renderNav();

    expect(screen.getByRole('link', { name: 'Writing' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Community' })).not.toHaveAttribute('aria-current');
  });

  it('marks the word count and sprint tools when they are open', () => {
    pathname.current = '/write/sprint';
    renderNav();

    expect(screen.getByRole('link', { name: 'Writing sprint' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Update my word count' })).not.toHaveAttribute('aria-current');
    expect(screen.getByRole('link', { name: 'Writing' })).not.toHaveAttribute('aria-current');
  });
});
