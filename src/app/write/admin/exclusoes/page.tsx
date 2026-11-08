import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { purgeAccountAction } from '@/app/actions/moderation';
import { SubmitButton } from '@/components/submit-button';
import { listPendingDeletions, type DeletionPreview } from '@/lib/account/account';
import { getDatabase } from '@/lib/db/client';
import type { Translate } from '@/lib/i18n/translate';
import { formatReportTime } from '@/lib/moderation/labels';
import { getTranslator } from '@/server/i18n';
import { currentAdmin } from '@/server/admin';
import { AdminNav } from '../admin-nav';

export const metadata: Metadata = { robots: { index: false, follow: false } };

type DeletionsPageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

function DeletionItem({ item, askedToConfirm, t }: { item: DeletionPreview; askedToConfirm: boolean; t: Translate }) {
  const { counts } = item;
  const lines = [
    t('{count} novels', { count: counts.novels }),
    t('{count} goals', { count: counts.goals }),
    t('{count} word count entries', { count: counts.entries }),
    t('{count} posts', { count: counts.posts }),
    t('{count} images', { count: counts.images }),
    counts.profile ? t('The profile') : t('No profile'),
    t('The account and its sessions'),
  ];

  return (
    <li className={`sheet flex flex-col gap-3 rounded-sm p-5 ${item.overdue ? 'border-l-4 border-danger' : ''}`}>
      <div className="flex flex-col gap-1">
        <p className="font-display text-lg font-semibold">
          {item.name} · @{item.username}
        </p>
        <p className="text-sm text-ink-soft">{item.email}</p>
        <p className="text-sm">
          {t('Requested on {date}. Grace period until {grace}. Deadline from the terms: {deadline}.', {
            date: formatReportTime(item.requestedAt),
            grace: formatReportTime(item.graceEndsAt),
            deadline: formatReportTime(item.deadline),
          })}
        </p>
        {item.overdue ? (
          <p className="text-sm font-semibold text-danger">{t('Past the deadline: delete it now.')}</p>
        ) : null}
      </div>
      <div>
        <p className="font-display text-sm font-semibold">{t('What will be deleted')}</p>
        <ul className="flex list-disc flex-col gap-0.5 pl-6 text-sm">
          {lines.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
        <p className="mt-1 text-xs text-ink-soft">
          {t('Access records and reports stay until their own expiry, as the terms say.')}
        </p>
      </div>
      {item.state === 'closed' ? (
        <form action={purgeAccountAction.bind(null, item.userId)} className="flex flex-col gap-2">
          <label className="flex items-start gap-3 text-sm">
            <input
              type="checkbox"
              name="confirm"
              className="mt-0.5 h-5 w-5 shrink-0"
              aria-invalid={askedToConfirm ? true : undefined}
            />
            <span>
              {t('I confirm deleting @{username} for good. This cannot be undone.', { username: item.username })}
            </span>
          </label>
          {askedToConfirm ? <p className="text-sm text-danger">{t('Tick the box to confirm.')}</p> : null}
          <SubmitButton variant="danger" pendingLabel={t('Deleting…')}>
            {t('Delete for good')}
          </SubmitButton>
        </form>
      ) : (
        <p className="text-sm text-ink-soft">{t('Still in the grace period: the writer can cancel until then.')}</p>
      )}
    </li>
  );
}

export default async function AdminDeletionsPage({ searchParams }: DeletionsPageProps) {
  if (!(await currentAdmin())) {
    notFound();
  }

  const database = await getDatabase();

  const t = await getTranslator();
  const confirmFor = (await searchParams).confirmar;
  const pending = await listPendingDeletions(database, new Date());
  const ready = pending.filter((item) => item.state === 'closed');

  return (
    <div className="flex flex-col gap-6">
      <AdminNav current="/write/admin/exclusoes" t={t} />
      <header className="flex flex-col gap-1">
        <h1 className="font-display text-4xl font-semibold">{t('Account deletions')}</h1>
        <p className="text-ink-soft">
          {t('{ready} ready to delete · {waiting} still in the grace period', {
            ready: ready.length,
            waiting: pending.length - ready.length,
          })}
        </p>
      </header>
      {pending.length > 0 ? (
        <ul className="flex flex-col gap-4">
          {pending.map((item) => (
            <DeletionItem key={item.userId} item={item} askedToConfirm={confirmFor === item.userId} t={t} />
          ))}
        </ul>
      ) : (
        <p className="text-ink-soft">{t('No account is waiting for deletion.')}</p>
      )}
    </div>
  );
}
