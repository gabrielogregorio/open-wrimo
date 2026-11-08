'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { pageTurn, sectionOf, type Section } from '@/lib/navigation';

// Remembered across page changes in this tab; the first page after a full load has no previous section.
let previousSection: Section | null = null;

function PageAt({ section, children }: { section: Section | null; children: ReactNode }) {
  const [turn] = useState(() => pageTurn(previousSection, section));

  useEffect(() => {
    previousSection = section;
  }, [section]);

  return (
    <div className="page-enter" data-turn={turn}>
      {children}
    </div>
  );
}

// Keyed by the address, so every page change plays its entrance, even inside one section.
export function PageEnter({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <PageAt key={pathname} section={sectionOf(pathname)}>
      {children}
    </PageAt>
  );
}
