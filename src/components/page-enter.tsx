'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { pageTurn, sectionOf, type Section } from '@/lib/navigation';

// Remembered across page changes in this tab; the first page after a full load has no previous section.
let previousSection: Section | null = null;

export function PageEnter({ children }: { children: ReactNode }) {
  const section = sectionOf(usePathname());
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
