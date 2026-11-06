import type { Metadata } from 'next';
import Link from 'next/link';
import { ProgressRing } from '@/components/progress-ring';
import { StatsShelf, type StatsBook } from '@/components/stats-shelf';
import { WritingChart } from '@/components/writing-chart';
import { PROJECT_STATUS_LABELS, UNIT_LABELS } from '@/components/writing-labels';
import { formatDay, formatMonth, formatNumber, formatShortDay } from '@/lib/i18n/format';
import { entriesForGoal } from '@/lib/writing/goals';
import { monthlyTotals, writingPace } from '@/lib/writing/stats';
import { getLocale, getTranslator } from '@/server/i18n';
import { loadNotebook } from '@/server/notebook';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslator();

  return { title: t('Stats') };
}

export default async function StatsPage({ searchParams }: PageProps<'/write/stats'>) {
  const notebook = await loadNotebook();
  const t = await getTranslator();
  const locale = await getLocale();
  const wanted = (await searchParams).goal;
  const lastActivity = (projectId: string, fallback: string): string =>
    notebook.entries.find((entry) => entry.projectId === projectId)?.createdAt ?? fallback;
  const shelfBooks: StatsBook[] = notebook.projects
    .map((project) => ({
      projectId: project.id,
      title: project.title,
      coverUrl: project.coverUrl,
      statusLabel: t(PROJECT_STATUS_LABELS[project.status]),
      completed: project.status === 'completed',
      activity: lastActivity(project.id, project.updatedAt),
      goals: notebook.goals
        .filter((item) => item.projectId === project.id)
        .map((item) => ({ id: item.id, label: item.name })),
    }))
    .filter((book) => book.goals.length > 0)
    .sort(
      (first, second) =>
        Number(first.completed) - Number(second.completed) || second.activity.localeCompare(first.activity),
    )
    .map(({ completed: _completed, activity: _activity, ...book }) => book);
  const goal =
    notebook.goals.find((item) => item.id === wanted) ??
    notebook.goals.find((item) => item.stats.state === 'active') ??
    notebook.goals[0];
  const number = (value: number): string => formatNumber(locale, value);
  const words = notebook.entries.filter((entry) => entry.unit === 'words');
  const pace = writingPace(words, notebook.today);
  const months = monthlyTotals(words);

  if (!goal) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="font-display text-4xl font-semibold">{t('Stats')}</h1>
        <p className="sheet rounded-sm p-10 text-center">
          {t('Create a novel with a goal to see your stats.')}{' '}
          <Link href="/write/novels/new" className="text-accent underline underline-offset-4">
            {t('Create novel')}
          </Link>
        </p>
      </div>
    );
  }

  const { stats } = goal;
  const projected = stats.projectedFinish ? formatDay(locale, stats.projectedFinish) : '—';
  const finishText = stats.reached ? t('Done!') : projected;
  const unit = t(UNIT_LABELS[goal.unit]);
  const recentDays = [...entriesForGoal(goal, notebook.entries)];
  const facts: [string, string][] = [
    [t('Daily average'), number(stats.averagePerDay)],
    [t('Par for the day'), number(stats.dailyPar)],
    [t('Par so far'), number(stats.parToday)],
    [t('Days left'), number(stats.daysLeft)],
    [
      t('Best day'),
      stats.bestDay ? `${number(stats.bestDay.count)} · ${formatShortDay(locale, stats.bestDay.date)}` : '—',
    ],
    [t('At this pace you finish on'), finishText],
  ];

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-4 rounded-sm bg-paper-deep p-5">
        <h1 className="font-display text-4xl font-semibold">{t('Stats')}</h1>
        <StatsShelf books={shelfBooks} goalId={goal.id} />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <ProgressRing
          value={stats.total}
          max={goal.target}
          valueText={number(stats.total)}
          maxText={number(goal.target)}
          caption={t('total {unit}', { unit })}
        />
        <ProgressRing
          value={stats.writtenToday}
          max={Math.max(stats.neededToday, 1)}
          valueText={number(stats.writtenToday)}
          maxText={number(stats.neededToday)}
          caption={t('{unit} needed today', { unit })}
        />
      </div>

      <dl className="grid grid-cols-2 gap-4 md:grid-cols-3">
        {facts.map(([label, value]) => (
          <div key={label} className="sheet rounded-sm p-4">
            <dt className="text-sm text-ink-soft">{label}</dt>
            <dd className="font-display text-2xl font-semibold">{value}</dd>
          </div>
        ))}
      </dl>

      <WritingChart
        points={stats.daily}
        daysElapsed={stats.daysElapsed}
        title={t('{unit} by day', { unit })}
        labels={{ day: t('Day'), written: t('Written that day'), total: t('Your total'), par: t('Par') }}
        formatDay={(date) => formatShortDay(locale, date)}
        formatNumber={number}
      />

      <section aria-labelledby="pace" className="flex flex-col gap-4">
        <h2 id="pace" className="ornament font-display text-lg">
          {t('My pace in words')}
        </h2>
        <dl className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {(
            [
              [t('Last 7 days, per day'), number(pace.lastSevenDays)],
              [t('Last 30 days, per day'), number(pace.lastThirtyDays)],
              [t('Per day I wrote'), number(pace.perWritingDay)],
              [t('Days I wrote'), number(pace.writingDays)],
              [t('Days in a row'), number(pace.currentStreak)],
              [t('Longest run'), number(pace.longestStreak)],
              [
                t('Best day ever'),
                pace.bestDay ? `${number(pace.bestDay.count)} · ${formatShortDay(locale, pace.bestDay.date)}` : '—',
              ],
              [t('Words written'), number(pace.total)],
            ] as [string, string][]
          ).map(([label, value]) => (
            <div key={label} className="sheet rounded-sm p-4">
              <dt className="text-sm text-ink-soft">{label}</dt>
              <dd className="font-display text-2xl font-semibold">{value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section aria-labelledby="months" className="flex flex-col gap-4">
        <h2 id="months" className="ornament font-display text-lg">
          {t('Words by month')}
        </h2>
        {months.length === 0 ? (
          <p className="text-center text-ink-soft italic">{t('Nothing logged yet.')}</p>
        ) : (
          <table className="sheet w-full rounded-sm text-left">
            <thead>
              <tr className="border-b border-rule">
                <th scope="col" className="p-3 font-display">
                  {t('Month')}
                </th>
                <th scope="col" className="p-3 font-display">
                  {t('Words')}
                </th>
                <th scope="col" className="p-3 font-display">
                  {t('Days I wrote')}
                </th>
                <th scope="col" className="p-3 font-display">
                  {t('Per day I wrote')}
                </th>
              </tr>
            </thead>
            <tbody>
              {months.map((month) => (
                <tr key={month.month} className="border-b border-rule last:border-0">
                  <th scope="row" className="p-3 font-normal">
                    {formatMonth(locale, month.month).replace(/^./, (letter) => letter.toUpperCase())}
                  </th>
                  <td className="p-3">{number(month.count)}</td>
                  <td className="p-3">{number(month.days)}</td>
                  <td className="p-3">{number(month.days > 0 ? Math.round(month.count / month.days) : 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <p className="text-center text-sm text-ink-soft">
        {t('{count} updates on this goal.', { count: number(recentDays.length) })}{' '}
        <Link href={`/write/update?goal=${goal.id}`} className="text-accent underline underline-offset-4">
          {t('Update')}
        </Link>
      </p>
    </div>
  );
}
