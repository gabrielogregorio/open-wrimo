import Link from 'next/link';
import type { Translate } from '@/lib/i18n/translate';

const PAGES = [
  { href: '/write/admin/reports', label: 'Reports' },
  { href: '/write/admin/exclusoes', label: 'Account deletions' },
] as const;

export function AdminNav({ current, t }: { current: (typeof PAGES)[number]['href']; t: Translate }) {
  return (
    <nav
      aria-label={t('Administration')}
      className="flex flex-wrap gap-4 border-b border-rule pb-2 font-display text-sm">
      {PAGES.map((page) => (
        <Link
          key={page.href}
          href={page.href}
          aria-current={page.href === current ? 'page' : undefined}
          className="nav-tab">
          {t(page.label)}
        </Link>
      ))}
    </nav>
  );
}
