import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { reopenReportAction, resolveReportAction } from '@/app/actions/moderation';
import { getDatabase } from '@/lib/db/client';
import { REPORT_REASON_LABELS, formatReportTime } from '@/lib/moderation/labels';
import { createReportRepository, type ReportStatus, type ReportView } from '@/lib/moderation/reports';
import { getTranslator } from '@/server/i18n';
import { getCurrentUser } from '@/server/session';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslator();

  return { title: t('Reports'), robots: { index: false, follow: false } };
}

const STATUS_TAB_LABELS: Record<ReportStatus, string> = { open: 'Open reports', resolved: 'Resolved reports' };

const actionButtonClasses =
  'inline-flex min-h-11 items-center justify-center rounded-sm border border-rule px-4 font-display text-sm font-semibold tracking-wide hover:bg-paper';

const single = (value: string | string[] | undefined): string => (Array.isArray(value) ? value[0] : (value ?? ''));

type Translate = Awaited<ReturnType<typeof getTranslator>>;

function ReportItem({ report, t }: { report: ReportView; t: Translate }) {
  const toggleAction =
    report.status === 'open' ? resolveReportAction.bind(null, report.id) : reopenReportAction.bind(null, report.id);
  const toggleLabel = report.status === 'open' ? t('Mark as resolved') : t('Reopen');

  return (
    <li className="sheet flex flex-col gap-3 rounded-sm p-4 sm:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-display text-lg font-semibold">{t(REPORT_REASON_LABELS[report.reason])}</h2>
        <time dateTime={report.createdAt.toISOString()} className="text-sm text-ink-soft">
          {formatReportTime(report.createdAt)}
        </time>
      </div>

      <dl className="grid gap-x-4 gap-y-1 text-sm sm:grid-cols-[max-content_1fr]">
        <dt className="font-semibold">{t('Reported')}</dt>
        <dd className="break-words">
          {report.targetUsername ? (
            <Link href={`/u/${report.targetUsername}`} className="underline underline-offset-4">
              {report.targetName} (@{report.targetUsername})
            </Link>
          ) : (
            t('Account no longer exists')
          )}
          {report.target === 'novel' ? ` · ${report.novelTitle ?? t('Novel no longer exists')}` : null}
        </dd>

        <dt className="font-semibold">{t('Reported by')}</dt>
        <dd className="break-words">{report.reporterUsername ? `@${report.reporterUsername}` : t('anonymous')}</dd>

        <dt className="font-semibold">{t('IP address')}</dt>
        <dd className="break-all">{report.reporterAddress ?? t('Unknown')}</dd>

        <dt className="font-semibold">{t('Browser')}</dt>
        <dd className="break-all text-ink-soft">{report.reporterUserAgent || t('Unknown')}</dd>

        {report.resolvedAt ? (
          <>
            <dt className="font-semibold">{t('Resolved at')}</dt>
            <dd>{formatReportTime(report.resolvedAt)}</dd>
          </>
        ) : null}
      </dl>

      {report.details ? (
        <p className="rounded-sm border border-rule p-3 text-sm break-words whitespace-pre-wrap">{report.details}</p>
      ) : null}

      <form action={toggleAction}>
        <button type="submit" className={actionButtonClasses}>
          {toggleLabel}
        </button>
      </form>
    </li>
  );
}

type AdminReportsPageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function AdminReportsPage({ searchParams }: AdminReportsPageProps) {
  const user = await getCurrentUser();
  const reports = createReportRepository(await getDatabase());

  if (!user || !(await reports.isAdmin(user.id))) {
    notFound();
  }

  const t = await getTranslator();
  const status: ReportStatus = single((await searchParams).status) === 'resolved' ? 'resolved' : 'open';
  const listed = await reports.listReports({ status });

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-4xl font-semibold">{t('Reports')}</h1>

      <nav aria-label={t('Report status')} className="flex flex-wrap gap-2">
        {(Object.keys(STATUS_TAB_LABELS) as ReportStatus[]).map((tab) => (
          <Link
            key={tab}
            href={`/write/admin/reports?status=${tab}`}
            aria-current={tab === status ? 'page' : undefined}
            className={`inline-flex min-h-11 items-center rounded-sm border px-4 font-display text-sm font-semibold ${
              tab === status ? 'border-accent bg-accent text-accent-ink' : 'border-rule'
            }`}>
            {t(STATUS_TAB_LABELS[tab])}
          </Link>
        ))}
      </nav>

      {listed.length > 0 ? (
        <ul className="flex flex-col gap-4">
          {listed.map((report) => (
            <ReportItem key={report.id} report={report} t={t} />
          ))}
        </ul>
      ) : (
        <p className="text-ink-soft">{t('No reports here.')}</p>
      )}
    </div>
  );
}
