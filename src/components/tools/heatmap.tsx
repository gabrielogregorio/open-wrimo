'use client';

import { useEffect, useRef, useState } from 'react';
import { useI18n } from '@/components/i18n-provider';
import { formatDay, formatNumber } from '@/lib/i18n/format';
import type { ToolData } from '@/lib/tools/data';
import { LEVELS, yearHeat } from '@/lib/tools/rhythm/heatmap';

const CELL = 13;
const GAP = 3;
const SHADES = [0, 30, 55, 78, 100];

export const shadeOf = (level: number): string =>
  level === 0 ? 'var(--paper)' : `color-mix(in srgb, var(--accent) ${SHADES[level]}%, var(--paper))`;

export default function Heatmap({ data }: { data: ToolData }) {
  const { t, locale } = useI18n();
  const thisYear = Number(data.today.slice(0, 4));
  const [year, setYear] = useState(thisYear);
  const [picked, setPicked] = useState<{ date: string; count: number } | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const heat = yearHeat(year, data.wordsByDay);
  const monthName = new Intl.DateTimeFormat(locale, { month: 'short', timeZone: 'UTC' });
  const firstYear = Math.min(thisYear, ...data.wordsByDay.slice(0, 1).map((day) => Number(day.date.slice(0, 4))));
  const todayWeek = heat.weeks.findIndex((week) => week.some((cell) => cell?.date === data.today));

  useEffect(() => {
    const element = scroller.current as HTMLDivElement;
    const column = todayWeek >= 0 ? todayWeek : heat.weeks.length;
    element.scrollLeft = Math.max(0, column * (CELL + GAP) - element.clientWidth / 2);
  }, [todayWeek, heat.weeks.length]);

  const changeYear = (next: number): void => {
    setYear(next);
    setPicked(null);
  };

  const arrowClass =
    'flex min-h-11 min-w-11 items-center justify-center rounded-sm border border-rule font-display text-lg disabled:opacity-40';

  return (
    <div className="flex flex-col gap-5">
      <section className="sheet flex flex-col gap-4 rounded-sm p-4 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            className={arrowClass}
            onClick={() => changeYear(year - 1)}
            disabled={year <= firstYear}
            aria-label={t('Previous year')}>
            ‹
          </button>
          <h2 className="font-display text-2xl font-semibold tabular-nums" aria-live="polite">
            {year}
          </h2>
          <button
            type="button"
            className={arrowClass}
            onClick={() => changeYear(year + 1)}
            disabled={year >= thisYear}
            aria-label={t('Next year')}>
            ›
          </button>
        </div>
        <div ref={scroller} data-testid="heatmap-scroller" className="max-w-full overflow-x-auto pb-2">
          <div
            className="relative"
            style={{ width: heat.weeks.length * (CELL + GAP), paddingTop: 18 }}
            role="group"
            aria-label={t('Words written each day in {year}', { year })}>
            {heat.months.map(({ month, week }) => (
              <span
                key={month}
                aria-hidden="true"
                className="absolute top-0 text-xs text-ink-soft"
                style={{ left: week * (CELL + GAP) }}>
                {monthName.format(new Date(Date.UTC(year, month, 1)))}
              </span>
            ))}
            <div className="flex" style={{ gap: GAP }}>
              {heat.weeks.map((week, weekIndex) => (
                <div key={weekIndex} className="flex flex-col" style={{ gap: GAP }}>
                  {week.map((cell, dayIndex) =>
                    cell ? (
                      <button
                        key={cell.date}
                        type="button"
                        onClick={() => setPicked(cell)}
                        aria-label={t('{date}: {count} words', {
                          date: formatDay(locale, cell.date),
                          count: formatNumber(locale, cell.count),
                        })}
                        aria-current={cell.date === data.today ? 'date' : undefined}
                        className={`rounded-[2px] border ${cell.date === data.today ? 'border-ink' : 'border-rule'}`}
                        style={{ width: CELL, height: CELL, background: shadeOf(cell.level) }}
                      />
                    ) : (
                      <span key={`empty-${dayIndex}`} style={{ width: CELL, height: CELL }} />
                    ),
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-ink-soft">
          <p role="status" className="min-h-5 text-sm text-ink">
            {picked
              ? t('{date}: {count} words', {
                  date: formatDay(locale, picked.date),
                  count: formatNumber(locale, picked.count),
                })
              : t('Tap a day to see its words.')}
          </p>
          <div className="flex items-center gap-1" aria-hidden="true">
            <span>{t('Less')}</span>
            {Array.from({ length: LEVELS }, (_unused, level) => (
              <span
                key={level}
                className="inline-block rounded-[2px] border border-rule"
                style={{ width: CELL, height: CELL, background: shadeOf(level) }}
              />
            ))}
            <span>{t('More')}</span>
          </div>
        </div>
      </section>
      <dl className="grid grid-cols-3 gap-3">
        <div className="sheet rounded-sm p-4">
          <dt className="text-xs text-ink-soft">{t('Words in the year')}</dt>
          <dd className="font-display text-xl font-semibold tabular-nums sm:text-2xl">
            {formatNumber(locale, heat.total)}
          </dd>
        </div>
        <div className="sheet rounded-sm p-4">
          <dt className="text-xs text-ink-soft">{t('Days written')}</dt>
          <dd className="font-display text-xl font-semibold tabular-nums sm:text-2xl">
            {formatNumber(locale, heat.daysWritten)}
          </dd>
        </div>
        <div className="sheet rounded-sm p-4">
          <dt className="text-xs text-ink-soft">{t('Longest streak')}</dt>
          <dd className="font-display text-xl font-semibold tabular-nums sm:text-2xl">
            {t('{count} days', { count: formatNumber(locale, heat.longestStreak) })}
          </dd>
        </div>
      </dl>
    </div>
  );
}
