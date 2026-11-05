'use client';

import Link from 'next/link';
import { formatMonth, formatNumber } from '@/lib/i18n/format';
import type { GoalWithStats } from '@/lib/writing/goals';
import { useI18n } from './i18n-provider';
import { PERIOD_SUFFIX, UNIT_LABELS } from './writing-labels';

export function GoalCard({
  goal,
  showName = true,
  readOnly = false,
}: {
  goal: GoalWithStats;
  showName?: boolean;
  readOnly?: boolean;
}) {
  const { t, locale } = useI18n();
  const unit = t(UNIT_LABELS[goal.unit]);
  const { stats } = goal;

  return (
    <div className="flex flex-col gap-3">
      <p className="text-ink-soft">
        {showName ? <span>{goal.name}: </span> : null}
        <span className="text-accent">
          {t('Write {target} {unit}', { target: formatNumber(locale, goal.target), unit })}
          {goal.period ? ` ${t(PERIOD_SUFFIX[goal.period])}` : ''}
        </span>
      </p>
      <div
        role="progressbar"
        aria-label={t('Progress in {title}', { title: goal.name })}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={stats.percent}
        className="h-3 w-full overflow-hidden rounded-full bg-rule">
        <div className="ink-fill h-full rounded-full bg-accent" style={{ width: `${stats.percent}%` }} />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-display">
          <span className="text-accent">{formatNumber(locale, stats.total)}</span> / {formatNumber(locale, goal.target)}{' '}
          <span className="text-sm tracking-wide uppercase">{unit}</span>
        </p>
        <p className="text-sm text-ink-soft">
          {goal.period
            ? t('Renews by itself')
            : t('Started {month}', { month: formatMonth(locale, goal.startDate.slice(0, 7)) })}
        </p>
      </div>
      {readOnly ? null : (
        <div className="flex flex-wrap items-center gap-4 text-sm">
          {stats.state === 'ended' ? null : (
            <Link
              href={`/write/update?goal=${goal.id}`}
              className="rounded-sm bg-accent px-3 py-1.5 font-display font-semibold text-accent-ink hover:brightness-110">
              {t('Update')}
            </Link>
          )}
          <Link href={`/write/stats?goal=${goal.id}`} className="underline underline-offset-4">
            {t('Stats')}
          </Link>
          {stats.reached ? (
            <Link href={`/write/goals/${goal.id}/certificate`} className="text-accent underline underline-offset-4">
              {t('Certificate')}
            </Link>
          ) : null}
        </div>
      )}
    </div>
  );
}
