'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { sectionOf } from '@/lib/navigation';

type MainNavProps = {
  label: string;
  writing: string;
  community: string;
  profile: string;
  update: string;
  sprint: string;
};

export function MainNav({ label, writing, community, profile, update, sprint }: MainNavProps) {
  const current = sectionOf(usePathname());
  const tabs = [
    { section: 'writing', href: '/write', text: writing },
    { section: 'community', href: '/write/community', text: community },
    { section: 'profile', href: '/write/profile', text: profile },
  ] as const;
  const page = (section: string) => (current === section ? ('page' as const) : undefined);

  return (
    <nav aria-label={label} className="flex items-center gap-5 font-display text-sm">
      {tabs.map((tab) => (
        <Link key={tab.section} href={tab.href} aria-current={page(tab.section)} className="nav-tab">
          {tab.text}
        </Link>
      ))}
      <span className="flex overflow-hidden rounded-sm border border-accent">
        <Link
          href="/write/update"
          aria-label={update}
          title={update}
          aria-current={page('update')}
          className="nav-tool px-2.5 py-1 text-lg leading-none">
          +
        </Link>
        <Link
          href="/write/sprint"
          aria-label={sprint}
          title={sprint}
          aria-current={page('sprint')}
          className="nav-tool border-l border-accent-ink/40 px-2.5 py-1">
          <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true" focusable="false">
            <circle cx="12" cy="13" r="8" fill="none" stroke="currentColor" strokeWidth="2" />
            <path d="M12 9v4l3 2M9 2h6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </Link>
      </span>
    </nav>
  );
}
