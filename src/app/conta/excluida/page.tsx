import type { Metadata } from 'next';
import Link from 'next/link';
import { DELETION_DEADLINE_DAYS, DELETION_GRACE_DAYS } from '@/lib/legal/terms-content';
import { getTranslator } from '@/server/i18n';

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function AccountDeletedPage() {
  const t = await getTranslator();

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4 text-center">
      <h1 className="font-display text-3xl font-semibold">{t('Your account is set to be deleted')}</h1>
      <p>
        {t(
          'It is hidden from now on. You can change your mind by signing in again within {grace} days; after that, everything is deleted for good within {deadline} days of your request.',
          { grace: DELETION_GRACE_DAYS, deadline: DELETION_DEADLINE_DAYS },
        )}
      </p>
      <p className="text-sm text-ink-soft">
        {t('What you saved in the Tools stays in this browser until you clear the site data.')}
      </p>
      <Link href="/" className="text-accent underline underline-offset-4">
        {t('Back to the start')}
      </Link>
    </div>
  );
}
