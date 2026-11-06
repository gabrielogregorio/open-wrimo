import Link from 'next/link';
import { signOutAction } from '@/app/actions/auth';
import { LogoMark } from '@/components/logo';
import { SubmitButton } from '@/components/submit-button';
import { getTranslator } from '@/server/i18n';
import { getCurrentUser } from '@/server/session';

export async function SiteHeader() {
  const t = await getTranslator();
  const user = await getCurrentUser();

  return (
    <header className="border-b border-rule">
      <div className="mx-auto flex max-w-5xl flex-wrap items-end justify-between gap-4 px-4 py-4">
        <Link href={user ? '/write' : '/'} className="flex items-center gap-2 text-accent">
          <LogoMark />
          <span className="font-display text-2xl font-semibold tracking-tight text-ink">Open Wrimo</span>
        </Link>
        {user ? (
          <nav aria-label={t('Main')} className="flex items-center gap-5 font-display text-sm">
            <Link href="/write" className="underline-offset-4 hover:underline">
              {t('Writing')}
            </Link>
            <Link href="/write/profile" className="underline-offset-4 hover:underline">
              {t('Profile')}
            </Link>
            <span className="flex overflow-hidden rounded-sm border border-accent">
              <Link
                href="/write/update"
                aria-label={t('Update my word count')}
                title={t('Update my word count')}
                className="bg-accent px-2.5 py-1 text-lg leading-none text-accent-ink hover:brightness-110">
                +
              </Link>
              <Link
                href="/write/sprint"
                aria-label={t('Writing sprint')}
                title={t('Writing sprint')}
                className="border-l border-accent-ink/40 bg-accent px-2.5 py-1 text-accent-ink hover:brightness-110">
                <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true" focusable="false">
                  <circle cx="12" cy="13" r="8" fill="none" stroke="currentColor" strokeWidth="2" />
                  <path d="M12 9v4l3 2M9 2h6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </Link>
            </span>
          </nav>
        ) : null}
        <div className="flex flex-wrap items-end gap-4">
          {user ? (
            <form action={signOutAction}>
              <SubmitButton variant="quiet">{t('Sign out')}</SubmitButton>
            </form>
          ) : null}
        </div>
      </div>
    </header>
  );
}
