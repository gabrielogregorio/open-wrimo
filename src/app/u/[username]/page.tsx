import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { BadgeHex } from '@/components/badge-hex';
import { RichText } from '@/components/rich-text';
import { getDatabase } from '@/lib/db/client';
import { formatNumber } from '@/lib/i18n/format';
import { PERSONAL_BADGES, WRITING_BADGES, earnedWritingBadges } from '@/lib/writing/badges';
import { localDate } from '@/lib/writing/dates';
import { withStats } from '@/lib/writing/goals';
import { createWritingRepository } from '@/lib/writing/repository';
import { writingPace } from '@/lib/writing/stats';
import { getLocale, getTranslator } from '@/server/i18n';
import { getTimeZone } from '@/server/session';
import { NovelCard } from '../../write/novel-card';

const loadWriter = async (username: string) => {
  const writing = createWritingRepository(await getDatabase());
  const writer = await writing.findPublicWriter(username.toLowerCase());

  return writer ? { writing, writer } : null;
};

export async function generateMetadata({ params }: PageProps<'/u/[username]'>): Promise<Metadata> {
  const found = await loadWriter((await params).username);

  return found ? { title: found.writer.name, robots: { index: false } } : { robots: { index: false } };
}

export default async function PublicProfilePage({ params }: PageProps<'/u/[username]'>) {
  const found = await loadWriter((await params).username);

  if (!found) {
    notFound();
  }

  const { writing, writer } = found;
  const t = await getTranslator();
  const locale = await getLocale();
  const today = localDate(new Date(), await getTimeZone());
  const [profile, allProjects, allGoals, allEntries] = await Promise.all([
    writing.getProfile(writer.userId),
    writing.listProjects(writer.userId),
    writing.listGoals(writer.userId),
    writing.listEntries(writer.userId),
  ]);
  const projects = allProjects.filter((project) => project.isPublic);
  const publicIds = new Set(projects.map((project) => project.id));
  const entries = allEntries.filter((entry) => publicIds.has(entry.projectId));
  const goals = withStats(
    allGoals.filter((goal) => publicIds.has(goal.projectId)),
    entries,
    today,
  );
  const pace = writingPace(
    entries.filter((entry) => entry.unit === 'words'),
    today,
  );
  const writingEarned = new Set(
    projects.flatMap((project) => [
      ...earnedWritingBadges(
        {
          goals: goals.filter((goal) => goal.projectId === project.id),
          entries: entries.filter((entry) => entry.projectId === project.id),
        },
        today,
      ),
    ]),
  );
  const personalEarned = new Set(projects.flatMap((project) => project.awards));
  const wordsOf = (projectId: string): number =>
    entries
      .filter((entry) => entry.projectId === projectId && entry.unit === 'words')
      .reduce((sum, entry) => sum + entry.count, 0);

  return (
    <div className="flex flex-col gap-10">
      <section className="sheet flex flex-wrap items-center gap-6 rounded-sm p-6">
        {profile.avatarUrl ? (
          <img
            src={profile.avatarUrl}
            alt=""
            className="h-32 w-32 rounded-full border-4 border-paper object-cover shadow-md"
          />
        ) : (
          <span
            className="flex h-32 w-32 items-center justify-center rounded-full bg-accent font-display text-5xl text-accent-ink shadow-md"
            aria-hidden="true">
            {writer.name.slice(0, 1).toUpperCase()}
          </span>
        )}
        <div className="flex flex-col gap-1">
          <h1 className="font-display text-4xl font-semibold">{writer.name}</h1>
          <p className="text-ink-soft">@{writer.username}</p>
          <p className="text-sm text-ink-soft">{[profile.location, profile.writingTime].filter(Boolean).join(' · ')}</p>
        </div>
      </section>

      {profile.shown.stats ? (
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {(
            [
              [t('Words written'), formatNumber(locale, pace.total)],
              [t('Novels'), formatNumber(locale, projects.length)],
              [t('Days in a row'), formatNumber(locale, pace.currentStreak)],
              [t('Longest run'), formatNumber(locale, pace.longestStreak)],
            ] as [string, string][]
          ).map(([label, value]) => (
            <div key={label} className="sheet rounded-sm p-4 text-center">
              <dt className="text-sm text-ink-soft">{label}</dt>
              <dd className="font-display text-2xl font-semibold">{value}</dd>
            </div>
          ))}
        </dl>
      ) : null}

      {profile.shown.bio && profile.bio ? (
        <section aria-labelledby="about" className="sheet flex flex-col gap-3 rounded-sm p-6">
          <h2 id="about" className="font-display text-lg tracking-wide uppercase">
            {t('About me')}
          </h2>
          <RichText html={profile.bio} />
        </section>
      ) : null}

      {profile.shown.favorites && (profile.favoriteBooks || profile.favoriteAuthors) ? (
        <section aria-labelledby="favorites" className="sheet flex flex-col gap-2 rounded-sm p-6">
          <h2 id="favorites" className="font-display text-lg tracking-wide uppercase">
            {t('Favorites')}
          </h2>
          {profile.favoriteBooks ? <p className="italic">{profile.favoriteBooks}</p> : null}
          {profile.favoriteAuthors ? <p className="italic">{profile.favoriteAuthors}</p> : null}
        </section>
      ) : null}

      {projects.length > 0 ? (
        <section aria-labelledby="novels" className="flex flex-col gap-6">
          <h2 id="novels" className="ornament font-display text-lg">
            {t('Novels')}
          </h2>
          {projects.map((novel) => (
            <NovelCard
              key={novel.id}
              novel={novel}
              goals={goals.filter((goal) => goal.projectId === novel.id)}
              totalWords={wordsOf(novel.id)}
              readOnly
            />
          ))}
        </section>
      ) : null}

      {profile.shown.badges && writingEarned.size + personalEarned.size > 0 ? (
        <section aria-labelledby="badges" className="flex flex-col gap-4">
          <h2 id="badges" className="ornament font-display text-lg">
            {t('Badges earned')}
          </h2>
          <ul className="flex flex-wrap justify-center gap-4">
            {WRITING_BADGES.filter((badge) => writingEarned.has(badge.id)).map((badge) => (
              <BadgeHex
                key={badge.id}
                badge={badge}
                earned
                label={t(badge.label, { count: badge.mark ?? '' })}
                description={t(badge.description, { count: badge.mark ?? '' })}
                statusText={t('Earned')}
              />
            ))}
            {PERSONAL_BADGES.filter((badge) => personalEarned.has(badge.id)).map((badge) => (
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
        </section>
      ) : null}
    </div>
  );
}
