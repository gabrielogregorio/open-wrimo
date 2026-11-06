import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { setPersonalBadgesAction } from '@/app/actions/writing';
import { BadgeHex } from '@/components/badge-hex';
import { GoalCard } from '@/components/goal-card';
import { PersonalBadgesForm } from '@/components/personal-badges-form';
import { RichText } from '@/components/rich-text';
import { GOAL_FILTER_LABELS } from '@/components/writing-labels';
import { formatDay } from '@/lib/i18n/format';
import { PERSONAL_BADGES, WRITING_BADGES } from '@/lib/writing/badges';
import { filterGoals } from '@/lib/writing/goals';
import { GOAL_FILTERS, type GoalFilter } from '@/lib/writing/schema';
import { getLocale, getTranslator } from '@/server/i18n';
import { loadNotebook, projectBadges, wordsFor } from '@/server/notebook';
import { NovelCard } from '../../novel-card';

const TABS = ['details', 'goals', 'badges'] as const;
type Tab = (typeof TABS)[number];
const TAB_LABELS: Record<Tab, string> = { details: 'Details', goals: 'Goals', badges: 'Badges' };

export async function generateMetadata({ params }: PageProps<'/write/novels/[id]'>): Promise<Metadata> {
  const { id } = await params;
  const notebook = await loadNotebook();

  return { title: notebook.projects.find((project) => project.id === id)?.title };
}

// eslint-disable-next-line sonarjs/cognitive-complexity -- one branch per tab of the novel
export default async function NovelPage({ params, searchParams }: PageProps<'/write/novels/[id]'>) {
  const { id } = await params;
  const query = await searchParams;
  const notebook = await loadNotebook();
  const novel = notebook.projects.find((project) => project.id === id);

  if (!novel) {
    notFound();
  }

  const t = await getTranslator();
  const locale = await getLocale();
  const tab: Tab = TABS.includes(query.tab as Tab) ? (query.tab as Tab) : 'details';
  const show: GoalFilter = GOAL_FILTERS.includes(query.show as GoalFilter) ? (query.show as GoalFilter) : 'all';
  const goals = notebook.goals.filter((goal) => goal.projectId === id);
  const earned = projectBadges(notebook, id);
  const tabHref = (next: Tab): string => `/write/novels/${id}?tab=${next}`;

  return (
    <div className="flex flex-col gap-8">
      <NovelCard novel={novel} goals={goals} totalWords={wordsFor(notebook, id)} headingLevel={1} />
      <nav aria-label={t('Novel sections')} className="border-b border-rule">
        <ul className="flex flex-wrap gap-6 font-display text-lg">
          {TABS.map((item) => (
            <li key={item}>
              <Link
                href={tabHref(item)}
                aria-current={tab === item ? 'page' : undefined}
                className={`inline-block border-b-4 pb-2 ${tab === item ? 'border-accent text-accent' : 'border-transparent text-ink-soft'}`}>
                {t(TAB_LABELS[item])}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {tab === 'details' ? (
        <section className="grid gap-6 md:grid-cols-2">
          <div className="sheet flex flex-col gap-2 rounded-sm p-6">
            <h2 className="font-display text-lg">{t('Summary')}</h2>
            <p className="whitespace-pre-line">{novel.summary || t('No summary yet.')}</p>
          </div>
          <div className="sheet flex flex-col gap-2 rounded-sm p-6">
            <h2 className="font-display text-lg">{t('Excerpt')}</h2>
            {novel.excerpt ? <RichText html={novel.excerpt} /> : <p className="italic">{t('No excerpt yet.')}</p>}
          </div>
          {novel.pinterestUrl || novel.playlistUrl ? (
            <div className="sheet flex flex-wrap gap-6 rounded-sm p-6 md:col-span-2">
              {novel.pinterestUrl ? (
                <a
                  href={novel.pinterestUrl}
                  rel="noopener noreferrer"
                  target="_blank"
                  className="underline underline-offset-4">
                  {t('Pinterest board')}
                </a>
              ) : null}
              {novel.playlistUrl ? (
                <a
                  href={novel.playlistUrl}
                  rel="noopener noreferrer"
                  target="_blank"
                  className="underline underline-offset-4">
                  {t('Playlist')}
                </a>
              ) : null}
            </div>
          ) : null}
        </section>
      ) : null}

      {tab === 'goals' ? (
        <section className="flex flex-col gap-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <Link
              href={`/write/novels/${id}/goals/new`}
              className="rounded-sm bg-accent px-4 py-2 font-display text-sm font-semibold text-accent-ink uppercase hover:brightness-110">
              {t('Create new goal')}
            </Link>
            <nav aria-label={t('Show goals')} className="flex flex-wrap gap-2 text-sm">
              {GOAL_FILTERS.map((filter) => (
                <Link
                  key={filter}
                  href={`/write/novels/${id}?tab=goals&show=${filter}`}
                  aria-current={show === filter ? 'page' : undefined}
                  className={`rounded-full border px-3 py-1 ${show === filter ? 'border-accent bg-accent text-accent-ink' : 'border-rule'}`}>
                  {t(GOAL_FILTER_LABELS[filter])}
                </Link>
              ))}
            </nav>
          </div>
          {filterGoals(goals, show).map((goal) => (
            <article key={goal.id} className="sheet relative flex flex-col gap-3 rounded-sm p-6">
              <Link
                href={`/write/goals/${goal.id}/edit`}
                className="absolute top-4 right-4 text-sm text-ink-soft underline underline-offset-4"
                aria-label={t('Settings of {title}', { title: goal.name })}>
                {t('Settings')}
              </Link>
              <h2 className="text-center font-display text-2xl">{goal.name}</h2>
              <GoalCard goal={goal} showName={false} />
              <p className="text-sm text-ink-soft">
                {formatDay(locale, goal.startDate)} – {formatDay(locale, goal.endDate)}
              </p>
            </article>
          ))}
          {filterGoals(goals, show).length === 0 ? (
            <p className="text-center text-ink-soft italic">{t('No goals here.')}</p>
          ) : null}
        </section>
      ) : null}

      {tab === 'badges' ? (
        <section className="flex flex-col gap-8">
          <ul className="flex flex-wrap justify-center gap-4" aria-label={t('Writing badges')}>
            {WRITING_BADGES.map((badge) => (
              <BadgeHex
                key={badge.id}
                badge={badge}
                earned={earned.has(badge.id)}
                label={t(badge.label, { count: badge.mark ?? '' })}
                description={t(badge.description, { count: badge.mark ?? '' })}
                statusText={earned.has(badge.id) ? t('Earned') : t('Not earned yet')}
              />
            ))}
          </ul>
          <ul className="flex flex-wrap justify-center gap-4" aria-label={t('Personal badges')}>
            {PERSONAL_BADGES.filter((badge) => novel.awards.includes(badge.id)).map((badge) => (
              <BadgeHex
                key={badge.id}
                kind="personal"
                badge={badge}
                earned
                label={t(badge.label)}
                description={t(badge.description)}
                statusText={t('Earned')}
              />
            ))}
          </ul>
          <div className="sheet rounded-sm p-6">
            <PersonalBadgesForm action={setPersonalBadgesAction.bind(null, id)} awarded={novel.awards} />
          </div>
        </section>
      ) : null}
    </div>
  );
}
