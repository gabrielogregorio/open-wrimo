import Link from 'next/link';
import { CoverCard } from '@/components/cover-card';
import { GoalCard } from '@/components/goal-card';
import { PROJECT_STATUS_LABELS, PROJECT_TYPE_LABELS } from '@/components/writing-labels';
import { currentGoal, type GoalWithStats } from '@/lib/writing/goals';
import type { ProjectView } from '@/lib/writing/repository';
import { formatNumber } from '@/lib/i18n/format';
import { getLocale, getTranslator } from '@/server/i18n';

export async function NovelCard({
  novel,
  goals,
  totalWords,
  headingLevel = 2,
  readOnly = false,
}: {
  novel: ProjectView;
  goals: GoalWithStats[];
  totalWords: number;
  headingLevel?: 1 | 2;
  readOnly?: boolean;
}) {
  const t = await getTranslator();
  const running = goals.filter((item) => item.stats.state === 'active');
  const shown = running.length > 0 ? running : [currentGoal(goals)].filter((item) => item !== null);
  const locale = await getLocale();
  const Heading = headingLevel === 1 ? 'h1' : 'h2';

  return (
    <article className="sheet relative flex flex-col gap-6 rounded-sm p-6 pt-10">
      <span className="ribbon-tag absolute -top-2 left-6 bg-accent px-4 py-1 pr-6 font-display text-sm font-semibold text-accent-ink shadow">
        {novel.featured ? t('Featured') : t(PROJECT_STATUS_LABELS[novel.status])}
      </span>
      <div className="flex flex-wrap items-start gap-6">
        <CoverCard title={novel.title} coverUrl={novel.coverUrl} />
        <div className="flex min-w-48 flex-1 flex-col gap-2">
          <Heading className="font-display text-3xl leading-tight font-semibold text-balance">
            {readOnly ? (
              novel.title
            ) : (
              <Link href={`/write/novels/${novel.id}`} className="hover:underline">
                {novel.title}
              </Link>
            )}
          </Heading>
          <p className="text-ink-soft">{[t(PROJECT_TYPE_LABELS[novel.type]), ...novel.genres].join(', ')}</p>
          {readOnly ? null : (
            <Link
              href={`/write/novels/${novel.id}/edit`}
              className="w-fit text-sm text-ink-soft underline underline-offset-4"
              aria-label={t('Settings of {title}', { title: novel.title })}>
              {t('Settings')}
            </Link>
          )}
        </div>
      </div>
      <p className="font-display text-lg">
        {t('Written so far: {count} words', { count: formatNumber(locale, totalWords) })}
      </p>
      {shown.length > 0 ? (
        <div className="flex flex-col gap-6 divide-y divide-rule">
          {shown.map((goal) => (
            <div key={goal.id} className="pt-4 first:pt-0">
              <GoalCard goal={goal} readOnly={readOnly} />
            </div>
          ))}
        </div>
      ) : null}
      {shown.length === 0 && !readOnly ? (
        <Link
          href={`/write/novels/${novel.id}/goals/new`}
          className="w-fit font-display text-accent underline underline-offset-4">
          {t('Set a goal for this novel')}
        </Link>
      ) : null}
    </article>
  );
}
