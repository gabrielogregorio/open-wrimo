import type { Metadata } from 'next';
import Link from 'next/link';
import { cancelDeletionAction, requestDeletionAction } from '@/app/actions/account';
import { signOutAction } from '@/app/actions/auth';
import { SubmitButton } from '@/components/submit-button';
import { createAccountRepository } from '@/lib/account/account';
import { getDatabase } from '@/lib/db/client';
import { TERMS_DATE_LABEL, needsTermsAcceptance } from '@/lib/legal/terms';
import { DELETION_DEADLINE_DAYS, DELETION_GRACE_DAYS } from '@/lib/legal/terms-content';
import { getTranslator } from '@/server/i18n';
import { requireUser } from '@/server/session';

export const metadata: Metadata = { robots: { index: false, follow: false } };

const DAY_MS = 86_400_000;

const brasilia = (date: Date): string =>
  new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long', timeStyle: 'short', timeZone: 'America/Sao_Paulo' }).format(
    date,
  );

const later = (date: Date, days: number): Date => new Date(date.getTime() + days * DAY_MS);

export default async function AccountPage({ searchParams }: PageProps<'/conta'>) {
  const user = await requireUser();
  const t = await getTranslator();
  const account = await createAccountRepository(await getDatabase()).status(user.id);
  const askedToConfirm = (await searchParams).confirmar === '1';
  const requestedAt = account?.deletionRequestedAt ?? null;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="font-display text-3xl font-semibold sm:text-4xl">{t('My account and data')}</h1>
        <p className="text-ink-soft">
          {user.name} · @{user.username} · {user.email}
        </p>
      </header>

      {requestedAt ? (
        <section
          className="sheet flex flex-col gap-3 rounded-sm border-l-4 border-danger p-5"
          aria-labelledby="deletion">
          <h2 id="deletion" className="font-display text-xl font-semibold">
            {t('Your account is set to be deleted')}
          </h2>
          <p>
            {t('Requested on {date}. You can cancel until {grace}; it is deleted for good by {deadline}.', {
              date: brasilia(requestedAt),
              grace: brasilia(later(requestedAt, DELETION_GRACE_DAYS)),
              deadline: brasilia(later(requestedAt, DELETION_DEADLINE_DAYS)),
            })}
          </p>
          <form action={cancelDeletionAction}>
            <SubmitButton pendingLabel={t('Saving…')}>{t('Cancel the deletion and keep my account')}</SubmitButton>
          </form>
        </section>
      ) : null}

      <section className="sheet flex flex-col gap-3 rounded-sm p-5" aria-labelledby="export">
        <h2 id="export" className="font-display text-xl font-semibold">
          {t('Export my data')}
        </h2>
        <p>
          {t(
            'Download everything you wrote down here (novels, goals, word counts and profile) as a JSON file. Do it often: it is your copy.',
          )}
        </p>
        <a
          href="/api/export"
          download
          className="inline-flex min-h-11 items-center self-start rounded-sm bg-accent px-4 font-display text-sm font-semibold text-accent-ink hover:brightness-110">
          {t('Download my data (.json)')}
        </a>
        <p className="text-sm text-ink-soft">
          {t('What you keep in the Tools lives in this browser; take it with the Full backup tool.')}
        </p>
      </section>

      <section className="sheet flex flex-col gap-2 rounded-sm p-5" aria-labelledby="terms">
        <h2 id="terms" className="font-display text-xl font-semibold">
          {t('Terms of Use and Privacy Policy')}
        </h2>
        <p>
          {account?.termsAcceptedAt && !needsTermsAcceptance(account.termsVersion)
            ? t('You accepted the version of {version} on {date}.', {
                version: TERMS_DATE_LABEL,
                date: brasilia(account.termsAcceptedAt),
              })
            : t('You have not accepted the current version yet.')}
        </p>
        <Link href="/termos" className="self-start text-accent underline underline-offset-4">
          {t('Read the terms')}
        </Link>
      </section>

      {requestedAt ? null : (
        <section className="sheet flex flex-col gap-3 rounded-sm p-5" aria-labelledby="delete">
          <h2 id="delete" className="font-display text-xl font-semibold">
            {t('Delete my account')}
          </h2>
          <p>
            {t(
              'Your account is hidden and you are signed out right away. You can cancel by signing in again within {grace} days; after that, your novels, goals, counts, profile and images are deleted for good within {deadline} days.',
              { grace: DELETION_GRACE_DAYS, deadline: DELETION_DEADLINE_DAYS },
            )}
          </p>
          <form action={requestDeletionAction} className="flex flex-col gap-3">
            <label className="flex items-start gap-3 text-sm">
              <input
                type="checkbox"
                name="confirm"
                className="mt-0.5 h-5 w-5 shrink-0"
                aria-invalid={askedToConfirm ? true : undefined}
                aria-describedby={askedToConfirm ? 'confirm-error' : undefined}
              />
              <span>{t('I understand, and I have exported what I want to keep.')}</span>
            </label>
            {askedToConfirm ? (
              <p id="confirm-error" className="text-sm text-danger">
                {t('Tick the box to confirm.')}
              </p>
            ) : null}
            <SubmitButton variant="danger" pendingLabel={t('Deleting…')}>
              {t('Delete my account')}
            </SubmitButton>
          </form>
        </section>
      )}

      <form action={signOutAction}>
        <SubmitButton variant="quiet" pendingLabel={t('Signing out…')}>
          {t('Sign out')}
        </SubmitButton>
      </form>
    </div>
  );
}
