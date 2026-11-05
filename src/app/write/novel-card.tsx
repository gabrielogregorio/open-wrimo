import Link from 'next/link';
import { CoverCard } from '@/components/cover-card';
import { GoalCard } from '@/components/goal-card';
import { PROJECT_STATUS_LABELS, PROJECT_TYPE_LABELS } from '@/components/writing-labels';
import { currentGoal, type GoalWithStats } from '@/lib/writing/goals';
import type { ProjectView } from '@/lib/writing/repository';
import { getTranslator } from '@/server/i18n';

export async function NovelCard({
  novel,
  goals,
  headingLevel = 2,
}: {
  novel: ProjectView;
  goals: GoalWithStats[];
  headingLevel?: 1 | 2;
}) {
  const t = await getTranslator();
  const goal = currentGoal(goals);
  const Heading = headingLevel === 1 ? 'h1' : 'h2';

  return (
    <article className="sheet relative flex flex-col gap-6 rounded-sm p-6 pt-10">
      <span className="ribbon-tag absolute -top-2 left-6 bg-accent px-4 py-1 pr-6 font-display text-sm font-semibold text-accent-ink shadow">
        {novel.featured ? t('Featured') : t(PROJECT_STATUS_LABELS[novel.status])}
      </span>
      <div className="flex flex-wrap items-start gap-6">
        <CoverCard title={novel.title} coverUrl={novel.coverUrl} summary={novel.summary} excerpt={novel.excerpt} />
        <div className="flex min-w-48 flex-1 flex-col gap-2">
          <Heading className="font-display text-3xl leading-tight font-semibold text-balance">
            <Link href={`/write/novels/${novel.id}`} className="hover:underline">
              {novel.title}
            </Link>
          </Heading>
          <p className="text-ink-soft">{[t(PROJECT_TYPE_LABELS[novel.type]), ...novel.genres].join(', ')}</p>
          <Link
            href={`/write/novels/${novel.id}/edit`}
            className="w-fit text-sm text-ink-soft underline underline-offset-4"
            aria-label={t('Settings of {title}', { title: novel.title })}>
            {t('Settings')}
          </Link>
        </div>
      </div>
      {goal ? (
        <GoalCard goal={goal} />
      ) : (
        <Link
          href={`/write/novels/${novel.id}/goals/new`}
          className="w-fit font-display text-accent underline underline-offset-4">
          {t('Set a goal for this novel')}
        </Link>
      )}
    </article>
  );
}
