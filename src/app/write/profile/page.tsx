import type { Metadata } from 'next';
import Link from 'next/link';
import { BadgeHex } from '@/components/badge-hex';
import { formatNumber } from '@/lib/i18n/format';
import { LIFETIME_BADGES, PARTICIPATION_BADGES, PERSONAL_BADGES, WRITING_BADGES } from '@/lib/writing/badges';
import { writingPace } from '@/lib/writing/stats';
import { getLocale, getTranslator } from '@/server/i18n';
import {
  allEarnedBadges,
  laurelCount,
  lifetimeBadges,
  lifetimeWords,
  loadNotebook,
  participationBadges,
  wordsFor,
} from '@/server/notebook';
import { requireUser } from '@/server/session';
import { NovelCard } from '../novel-card';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslator();

  return { title: t('My profile') };
}

export default async function ProfilePage() {
  const user = await requireUser();
  const t = await getTranslator();
  const locale = await getLocale();
  const notebook = await loadNotebook();
  const profile = await notebook.context.writing.getProfile(user.id);
  const pace = writingPace(
    notebook.entries.filter((entry) => entry.unit === 'words'),
    notebook.today,
  );
  const earnedKeys = allEarnedBadges(notebook);
  const earned = new Set(earnedKeys.map((key) => key.split(':')[1]));
  const participation = participationBadges(notebook);
  const laurels = laurelCount(notebook);
  const favoriteBooks = profile.favoriteBooks;
  const favoriteAuthors = profile.favoriteAuthors;
  const lifetime = lifetimeBadges(notebook);
  const writingBadges = [
    ...LIFETIME_BADGES.filter((badge) => lifetime.has(badge.id)),
    ...WRITING_BADGES.filter((badge) => earned.has(badge.id)),
  ];
  const personalBadges = PERSONAL_BADGES.filter((badge) => earned.has(badge.id));
  const numbers: [string, string][] = [
    [t('Words written'), formatNumber(locale, lifetimeWords(notebook))],
    [t('Novels'), formatNumber(locale, notebook.projects.length)],
    [t('Laurels'), formatNumber(locale, laurels)],
    [t('Days in a row'), formatNumber(locale, pace.currentStreak)],
    [t('Longest run'), formatNumber(locale, pace.longestStreak)],
    [t('Badges'), formatNumber(locale, earnedKeys.length + participation.size)],
  ];

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
            {user.name.slice(0, 1).toUpperCase()}
          </span>
        )}
        <div className="flex min-w-48 flex-1 flex-col gap-2">
          <h1 className="font-display text-4xl font-semibold">{user.name}</h1>
          {laurels > 0 ? (
            <p className="flex items-center gap-2 text-sm text-[#a8641a]" title={t('A laurel for each goal you met')}>
              <span aria-hidden="true">{'🏆'.repeat(Math.min(laurels, 10))}</span>
              <span className="font-display">
                {laurels === 1 ? t('1 goal met') : t('{count} goals met', { count: laurels })}
              </span>
            </p>
          ) : null}
          <p className="text-sm text-ink-soft">
            {[profile.location, profile.writingTime].filter(Boolean).join(' · ') ||
              t('Tell where and when you write in your profile.')}
          </p>
          <p className="text-sm text-ink-soft">@{user.username}</p>
          <div className="flex flex-wrap gap-4 text-sm">
            <Link href="/write/profile/edit" className="underline underline-offset-4">
              {t('Edit profile')}
            </Link>
            {profile.isPublic ? (
              <Link href={`/u/${user.username}`} className="text-accent underline underline-offset-4">
                {t('See my public profile')}
              </Link>
            ) : (
              <span className="text-ink-soft">{t('Your profile is private.')}</span>
            )}
          </div>
        </div>
      </section>

      <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {numbers.map(([label, value]) => (
          <div key={label} className="sheet rounded-sm p-4 text-center">
            <dt className="text-sm text-ink-soft">{label}</dt>
            <dd className="font-display text-2xl font-semibold">{value}</dd>
          </div>
        ))}
      </dl>

      <section aria-labelledby="about-me" className="sheet flex flex-col gap-3 rounded-sm p-6">
        <h2 id="about-me" className="font-display text-lg tracking-wide uppercase">
          {t('About me')}
        </h2>
        <p className="whitespace-pre-line">{profile.bio || t('No bio yet.')}</p>
      </section>

      <section aria-labelledby="favorites" className="sheet flex flex-col gap-3 rounded-sm p-6">
        <h2 id="favorites" className="font-display text-lg tracking-wide uppercase">
          {t('Favorites')}
        </h2>
        <p className="text-ink-soft italic">{favoriteBooks || t('No favorite books')}</p>
        <p className="text-ink-soft italic">{favoriteAuthors || t('No favorite authors')}</p>
      </section>

      <section aria-labelledby="my-novels" className="flex flex-col gap-6">
        <h2 id="my-novels" className="ornament font-display text-lg">
          {t('My novels')}
        </h2>
        {notebook.projects.length === 0 ? (
          <p className="text-center text-ink-soft italic">
            {t('No novels yet.')}{' '}
            <Link href="/write/novels/new" className="text-accent underline underline-offset-4">
              {t('Create novel')}
            </Link>
          </p>
        ) : null}
        {notebook.projects.map((novel) => (
          <NovelCard
            key={novel.id}
            novel={novel}
            goals={notebook.goals.filter((goal) => goal.projectId === novel.id)}
            totalWords={wordsFor(notebook, novel.id)}
          />
        ))}
      </section>

      <section aria-labelledby="profile-badges" className="flex flex-col gap-6">
        <h2 id="profile-badges" className="ornament font-display text-lg">
          {t('Badges earned')}
        </h2>
        {writingBadges.length + personalBadges.length + participation.size === 0 ? (
          <p className="text-center text-ink-soft italic">{t('No badges yet. Log your first words!')}</p>
        ) : null}
        <ul className="flex flex-wrap justify-center gap-4">
          {writingBadges.map((badge) => (
            <BadgeHex
              key={badge.id}
              badge={badge}
              earned
              label={t(badge.label, { count: badge.mark ?? '' })}
              description={t(badge.description, { count: badge.mark ?? '' })}
              statusText={t('Earned')}
            />
          ))}
          {personalBadges.map((badge) => (
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
          {PARTICIPATION_BADGES.filter((badge) => participation.has(badge.id)).map((badge) => (
            <BadgeHex
              key={badge.id}
              kind="participation"
              badge={badge}
              earned
              label={t(badge.label)}
              description={t(badge.description)}
              statusText={t('Earned')}
            />
          ))}
        </ul>
      </section>
    </div>
  );
}
