import Link from 'next/link';
import { signOutAction } from '@/app/actions/auth';
import { LogoMark } from '@/components/logo';
import { MainNav } from '@/components/main-nav';
import { SubmitButton } from '@/components/submit-button';
import { getTranslator } from '@/server/i18n';
import { getCurrentUser } from '@/server/session';

export async function SiteHeader() {
  const t = await getTranslator();
  const user = await getCurrentUser();

  return (
    <header className="border-b border-rule">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3 sm:items-end sm:py-4">
        <Link href={user ? '/write' : '/'} className="flex items-center gap-2 text-accent">
          <LogoMark />
          <span className="font-display text-2xl font-semibold tracking-tight text-ink">Open Wrimo</span>
        </Link>
        {user ? (
          <MainNav
            label={t('Main')}
            writing={t('Writing')}
            tools={t('Tools')}
            community={t('Community')}
            profile={t('Profile')}
            update={t('Update my word count')}
            sprint={t('Writing sprint')}
          />
        ) : null}
        <div className="flex flex-wrap items-end gap-4">
          {user ? (
            <form action={signOutAction}>
              <SubmitButton variant="quiet" pendingLabel={t('Signing out…')}>
                {t('Sign out')}
              </SubmitButton>
            </form>
          ) : null}
        </div>
      </div>
    </header>
  );
}
