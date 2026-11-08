'use client';

import { PenLine, UserRound, Users, Wrench } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { sectionOf } from '@/lib/navigation';

type MainNavProps = {
  label: string;
  writing: string;
  tools: string;
  community: string;
  profile: string;
  update: string;
  sprint: string;
};

export function MainNav({ label, writing, tools, community, profile, update, sprint }: MainNavProps) {
  const current = sectionOf(usePathname());
  const tabs = [
    { section: 'writing', href: '/write', text: writing, Icon: PenLine },
    { section: 'tools', href: '/write/tools', text: tools, Icon: Wrench },
    { section: 'community', href: '/write/community', text: community, Icon: Users },
    { section: 'profile', href: '/write/profile', text: profile, Icon: UserRound },
  ] as const;
  const page = (section: string) => (current === section ? ('page' as const) : undefined);

  return (
    <nav
      aria-label={label}
      className="main-nav order-last -mx-4 flex w-[calc(100%+2rem)] items-center gap-3 overflow-x-auto px-4 font-display text-[0.8125rem] sm:order-none sm:mx-0 sm:w-auto sm:gap-5 sm:overflow-visible sm:px-0 sm:text-sm">
      {tabs.map((tab) => (
        <Link
          key={tab.section}
          href={tab.href}
          aria-current={page(tab.section)}
          aria-label={tab.text}
          title={tab.text}
          className="nav-tab">
          {/* Below 400px the tabs are icons; the label keeps their name for screen readers. */}
          <tab.Icon className="hidden h-5 w-5 max-[399px]:block" aria-hidden="true" />
          <span className="max-[399px]:hidden">{tab.text}</span>
        </Link>
      ))}
      <span className="flex shrink-0 overflow-hidden rounded-sm border border-accent">
        <Link
          href="/write/update"
          aria-label={update}
          title={update}
          aria-current={page('update')}
          className="nav-tool px-2 py-1 text-lg leading-none sm:px-2.5">
          +
        </Link>
        <Link
          href="/write/sprint"
          aria-label={sprint}
          title={sprint}
          aria-current={page('sprint')}
          className="nav-tool border-l border-accent-ink/40 px-2 py-1 sm:px-2.5">
          <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true" focusable="false">
            <circle cx="12" cy="13" r="8" fill="none" stroke="currentColor" strokeWidth="2" />
            <path d="M12 9v4l3 2M9 2h6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </Link>
      </span>
    </nav>
  );
}
