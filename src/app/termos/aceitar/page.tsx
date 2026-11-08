import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { acceptTermsAction } from '@/app/actions/account';
import { signOutAction } from '@/app/actions/auth';
import { SubmitButton } from '@/components/submit-button';
import { createAccountRepository } from '@/lib/account/account';
import { getDatabase } from '@/lib/db/client';
import { TERMS_CHANGES, TERMS_DATE_LABEL, needsTermsAcceptance } from '@/lib/legal/terms';
import { getTranslator } from '@/server/i18n';
import { requireUser } from '@/server/session';

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function AcceptTermsPage({ searchParams }: PageProps<'/termos/aceitar'>) {
  const user = await requireUser();
  const t = await getTranslator();
  const account = await createAccountRepository(await getDatabase()).status(user.id);
  const next = (await searchParams).next;

  if (!needsTermsAcceptance(account?.termsVersion)) {
    redirect('/write');
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="font-display text-3xl font-semibold sm:text-4xl">{t('The terms have changed')}</h1>
        <p className="text-ink-soft">
          {t('To keep using the writing area, read what changed and accept the version of {date}.', {
            date: TERMS_DATE_LABEL,
          })}
        </p>
      </header>
      <section className="sheet flex flex-col gap-3 rounded-sm p-5" aria-labelledby="terms-changes">
        <h2 id="terms-changes" className="font-display text-xl font-semibold">
          {t('What changed')}
        </h2>
        <ul className="flex list-disc flex-col gap-1 pl-6">
          {TERMS_CHANGES.map((change) => (
            <li key={change}>{change}</li>
          ))}
        </ul>
        <Link href="/termos" target="_blank" className="self-start text-accent underline underline-offset-4">
          {t('Read the full Terms of Use and Privacy Policy')}
        </Link>
      </section>
      <form action={acceptTermsAction} className="flex flex-col gap-3">
        <input type="hidden" name="next" value={typeof next === 'string' ? next : '/write'} />
        <SubmitButton pendingLabel={t('Saving…')}>{t('I have read and accept the new terms')}</SubmitButton>
      </form>
      <p className="text-sm text-ink-soft">
        {t('If you do not agree, you can still export your data and delete your account, or sign out.')}
      </p>
      <div className="flex flex-wrap items-center gap-4 text-sm">
        <Link href="/conta" className="underline underline-offset-4">
          {t('My account and data')}
        </Link>
        <form action={signOutAction}>
          <SubmitButton variant="quiet" pendingLabel={t('Signing out…')}>
            {t('Sign out')}
          </SubmitButton>
        </form>
      </div>
    </div>
  );
}
