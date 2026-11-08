'use client';

import { useState } from 'react';
import { fieldClasses } from '@/components/form-field';
import { useI18n } from '@/components/i18n-provider';
import { formatDay, formatNumber } from '@/lib/i18n/format';
import type { ToolData, ToolNovel } from '@/lib/tools/data';
import { planGoal } from '@/lib/tools/rhythm/goal';
import { addDays, isIsoDate } from '@/lib/writing/dates';
import { CountField } from './rhythm/count-field';

const DEFAULT_TARGET = 50000;

const targetOf = (novel: ToolNovel | undefined): number => novel?.goals[0]?.target ?? DEFAULT_TARGET;

const endOf = (novel: ToolNovel | undefined, today: string): string => {
  const goalEnd = novel?.goals[0]?.endDate;

  return goalEnd && goalEnd >= today ? goalEnd : addDays(today, 29);
};

export default function GoalCalculator({ data }: { data: ToolData }) {
  const { t, locale } = useI18n();
  const first = data.novels[0];
  const [novelId, setNovelId] = useState(first?.id ?? '');
  const [target, setTarget] = useState(targetOf(first));
  const [current, setCurrent] = useState(first?.totalWords ?? 0);
  const [endDate, setEndDate] = useState(endOf(first, data.today));
  const validDate = isIsoDate(endDate);
  const plan = planGoal({
    today: data.today,
    target,
    current,
    endDate: validDate ? endDate : data.today,
    wordsByDay: data.wordsByDay,
  });
  const number = (value: number): string => formatNumber(locale, Math.round(value));

  const chooseNovel = (id: string): void => {
    const novel = data.novels.find((item) => item.id === id);
    setNovelId(id);
    setCurrent(novel?.totalWords ?? 0);
    setTarget(targetOf(novel));
    setEndDate(endOf(novel, data.today));
  };

  return (
    <div className="flex flex-col gap-5">
      <section className="sheet flex flex-col gap-4 rounded-sm p-5 sm:p-6">
        {data.novels.length > 0 ? (
          <div className="flex flex-col gap-1">
            <label htmlFor="goal-novel" className="font-display text-sm font-semibold">
              {t('Novel')}
            </label>
            <select
              id="goal-novel"
              value={novelId}
              onChange={(event) => chooseNovel(event.target.value)}
              className={`${fieldClasses} min-h-11`}>
              {data.novels.map((novel) => (
                <option key={novel.id} value={novel.id}>
                  {novel.title}
                </option>
              ))}
              <option value="">{t('No novel, I will type the numbers')}</option>
            </select>
          </div>
        ) : null}
        <div className="grid gap-4 sm:grid-cols-3">
          <CountField id="goal-target" label={t('Target words')} value={target} onChange={setTarget} />
          <CountField
            id="goal-current"
            label={t('Words so far')}
            value={current}
            onChange={setCurrent}
            hint={t('Filled from your novel; change it if you counted elsewhere.')}
          />
          <div className="flex flex-col gap-1">
            <label htmlFor="goal-end" className="font-display text-sm font-semibold">
              {t('Finish date')}
            </label>
            <input
              id="goal-end"
              type="date"
              value={endDate}
              min={data.today}
              onChange={(event) => setEndDate(event.target.value)}
              className={`${fieldClasses} min-h-11`}
            />
          </div>
        </div>
      </section>
      <section className="sheet flex flex-col gap-4 rounded-sm p-5 sm:p-6" aria-live="polite">
        {plan.remaining === 0 ? (
          <p className="font-display text-2xl text-accent">{t('You already reached this target. Congratulations!')}</p>
        ) : (
          <>
            <p className="flex flex-col">
              <span className="font-display text-5xl font-semibold tabular-nums text-accent">
                {number(plan.perDay)}
              </span>
              <span className="text-ink-soft">
                {plan.daysLeft > 0
                  ? t('words a day for {days} days, today included', { days: plan.daysLeft })
                  : t('words today: the finish date has passed')}
              </span>
            </p>
            <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
              <div>
                <dt className="text-ink-soft">{t('Words to go')}</dt>
                <dd className="font-display text-xl tabular-nums">{number(plan.remaining)}</dd>
              </div>
              <div>
                <dt className="text-ink-soft">{t('Your pace (last 7 days)')}</dt>
                <dd className="font-display text-xl tabular-nums">
                  {t('{count} a day', { count: number(plan.pace) })}
                </dd>
              </div>
              <div className="col-span-2 sm:col-span-1">
                <dt className="text-ink-soft">{t('At this pace you finish on')}</dt>
                <dd className="font-display text-xl">
                  {plan.projectedDate ? formatDay(locale, plan.projectedDate) : t('no recent writing yet')}
                </dd>
              </div>
            </dl>
            <p className={plan.onTrack ? 'text-accent' : 'text-ink-soft'}>
              {plan.onTrack
                ? t('Keep this pace and you get there in time.')
                : t('Your recent pace is not enough yet. Write a little more each day to catch up.')}
            </p>
          </>
        )}
      </section>
    </div>
  );
}
