'use client';

import Link from 'next/link';
import { useCallback, useState } from 'react';
import type { FormState } from '@/lib/form';
import { formatMonth, formatNumber } from '@/lib/i18n/format';
import type { GoalWithStats } from '@/lib/writing/goals';
import { ConfirmDelete } from './confirm-delete';
import { GoalForm } from './goal-form';
import { useI18n } from './i18n-provider';
import { PERIOD_SUFFIX, UNIT_LABELS } from './writing-labels';

export function GoalCard({
  goal,
  showName = true,
  readOnly = false,
  today,
  editAction,
  deleteAction,
}: {
  goal: GoalWithStats;
  showName?: boolean;
  readOnly?: boolean;
  today?: string;
  editAction?: (state: FormState, formData: FormData) => Promise<FormState>;
  deleteAction?: () => Promise<void>;
}) {
  const { t, locale } = useI18n();
  const [editing, setEditing] = useState(false);
  const close = useCallback(() => setEditing(false), []);

  if (editing && editAction && today) {
    return (
      <div className="flex flex-col gap-4 rounded-sm border border-accent/40 bg-paper p-4">
        <p className="font-display text-sm tracking-wide text-accent uppercase">{t('Edit goal')}</p>
        <GoalForm action={editAction} today={today} defaultName={goal.name} goal={goal} onDone={close} />
        {deleteAction ? (
          <ConfirmDelete
            action={deleteAction}
            label={t('Delete this goal')}
            question={t('Delete the goal? The words you logged stay on the novel.')}
            confirmLabel={t('Yes, delete it')}
          />
        ) : null}
      </div>
    );
  }

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
          {editAction ? (
            <button type="button" onClick={() => setEditing(true)} className="underline underline-offset-4">
              {t('Edit goal')}
            </button>
          ) : null}
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
