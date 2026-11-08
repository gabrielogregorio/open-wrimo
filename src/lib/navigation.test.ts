import { pageTurn, sectionOf } from './navigation';

describe('sectionOf', () => {
  it.each([
    ['/write', 'writing'],
    ['/write/novels/abc', 'writing'],
    ['/write/stats', 'writing'],
    ['/write/community', 'community'],
    ['/write/profile/edit', 'profile'],
    ['/write/update', 'update'],
    ['/write/sprint', 'sprint'],
  ])('puts %s in %s', (pathname, section) => {
    expect(sectionOf(pathname)).toBe(section);
  });

  it('leaves pages outside the writing area without a section', () => {
    expect(sectionOf('/login')).toBeNull();
    expect(sectionOf('/writers')).toBeNull();
    expect(sectionOf('/write-not')).toBeNull();
  });
});

describe('pageTurn', () => {
  it('turns forward to a section on the right and back to one on the left', () => {
    expect(pageTurn('writing', 'profile')).toBe('forward');
    expect(pageTurn('update', 'community')).toBe('back');
  });

  it('moves within a section, and does not turn from or to outside the writing area', () => {
    expect(pageTurn('writing', 'writing')).toBe('within');
    expect(pageTurn(null, 'writing')).toBe('none');
    expect(pageTurn('profile', null)).toBe('none');
  });
});
