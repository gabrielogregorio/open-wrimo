// The writing area reads like the chapters of one book, left to right, so a move between them can turn
// the page forward or back.
export const SECTIONS = ['writing', 'community', 'profile', 'update', 'sprint'] as const;

export type Section = (typeof SECTIONS)[number];
export type PageTurn = 'forward' | 'back' | 'none';

const OWN_PAGES: Record<Exclude<Section, 'writing'>, string> = {
  community: '/write/community',
  profile: '/write/profile',
  update: '/write/update',
  sprint: '/write/sprint',
};

const isUnder = (pathname: string, base: string): boolean => pathname === base || pathname.startsWith(`${base}/`);

export const sectionOf = (pathname: string): Section | null => {
  const own = (Object.keys(OWN_PAGES) as Exclude<Section, 'writing'>[]).find((section) =>
    isUnder(pathname, OWN_PAGES[section]),
  );

  if (own) {
    return own;
  }

  return isUnder(pathname, '/write') ? 'writing' : null;
};

export const pageTurn = (from: Section | null, to: Section | null): PageTurn => {
  if (!from || !to || from === to) {
    return 'none';
  }

  return SECTIONS.indexOf(to) > SECTIONS.indexOf(from) ? 'forward' : 'back';
};
