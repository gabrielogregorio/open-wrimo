import Link from 'next/link';
import { signOutAction } from '@/app/actions/auth';
import { LogoMark } from '@/components/logo';
import { PreferencesMenu } from '@/components/preferences-menu';
import { SubmitButton } from '@/components/submit-button';
import { getTranslator } from '@/server/i18n';
import { getCurrentUser } from '@/server/session';

export async function SiteHeader() {
  const t = await getTranslator();
  const user = await getCurrentUser();

  return (
    <header className="border-b border-rule">
      <div className="mx-auto flex max-w-5xl flex-wrap items-end justify-between gap-4 px-4 py-4">
        <Link href={user ? '/shelf' : '/'} className="flex items-center gap-2 text-accent">
          <LogoMark />
          <span className="font-display text-2xl font-semibold tracking-tight text-ink">Open Wrimo</span>
        </Link>
        {user ? (
          <nav aria-label={t('Main')} className="flex items-center gap-5 font-display text-sm">
            <Link href="/shelf" className="underline-offset-4 hover:underline">
              {t('My shelf')}
            </Link>
            <Link href="/shelf/new" className="underline-offset-4 hover:underline">
              {t('Add a book')}
            </Link>
          </nav>
        ) : null}
        <div className="flex flex-wrap items-end gap-4">
          <PreferencesMenu />
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
