import type { Metadata } from 'next';
import Link from 'next/link';
import { BadgeHex } from '@/components/badge-hex';
import { formatNumber } from '@/lib/i18n/format';
import { PARTICIPATION_BADGES, WRITING_BADGES } from '@/lib/writing/badges';
import { writingPace } from '@/lib/writing/stats';
import { getLocale, getTranslator } from '@/server/i18n';
import { allEarnedBadges, laurelCount, loadNotebook, participationBadges } from '@/server/notebook';
import { bookRepository, requireUser } from '@/server/session';
import { NovelCard } from './novel-card';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslator();

  return { title: t('Writing desk') };
}

export default async function WritingDeskPage() {
  const user = await requireUser();
  const t = await getTranslator();
  const locale = await getLocale();
  const notebook = await loadNotebook();
  const [featured, ...others] = notebook.projects;
  const words = notebook.entries.filter((entry) => entry.unit === 'words');
  const pace = writingPace(words, notebook.today);
  const earned = new Set(allEarnedBadges(notebook).map((key) => key.split(':')[1]));
  const shelf = await (await bookRepository()).list(user.id, { page: 1 });
  const favorites = shelf.books.filter((book) => book.rating === 5);
  const favoriteAuthors = [...new Set(favorites.map((book) => book.author))];
  const participation = participationBadges(notebook);
  const goalsOf = (projectId: string) => notebook.goals.filter((goal) => goal.projectId === projectId);
  const numbers = [
    [t('Words written'), formatNumber(locale, pace.total)],
    [t('Days in a row'), formatNumber(locale, pace.currentStreak)],
    [t('Laurels'), formatNumber(locale, laurelCount(notebook))],
    [t('Badges'), formatNumber(locale, earned.size)],
  ];

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-display text-sm tracking-[0.3em] text-accent uppercase">
            {t('Hello, {name}', { name: user.name })}
          </p>
          <h1 className="font-display text-4xl font-semibold">{t('Writing desk')}</h1>
        </div>
        <div className="flex flex-wrap gap-3 font-display text-sm">
          <Link
            href="/write/novels/new"
            className="rounded-sm bg-accent px-4 py-2 font-semibold text-accent-ink hover:brightness-110">
            {t('Create novel')}
          </Link>
          <Link href="/write/stats" className="rounded-sm border border-rule px-4 py-2 hover:bg-paper-deep">
            {t('Stats')}
          </Link>
          <Link href="/write/posts" className="rounded-sm border border-rule px-4 py-2 hover:bg-paper-deep">
            {t('Posts')}
          </Link>
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {numbers.map(([label, value]) => (
          <div key={label} className="sheet rounded-sm p-4 text-center">
            <dt className="text-sm text-ink-soft">{label}</dt>
            <dd className="font-display text-3xl font-semibold">{value}</dd>
          </div>
        ))}
      </dl>

      {featured ? (
        <NovelCard novel={featured} goals={goalsOf(featured.id)} />
      ) : (
        <div className="sheet rounded-sm p-10 text-center">
          <p className="font-display text-xl">{t('No novels yet.')}</p>
          <p className="mt-2 text-ink-soft">{t('Create your first novel and give it a goal.')}</p>
        </div>
      )}

      {others.length > 0 ? (
        <section aria-labelledby="other-novels" className="flex flex-col gap-4">
          <h2 id="other-novels" className="ornament font-display text-lg">
            {t('My novels')}
          </h2>
          {others.map((novel) => (
            <NovelCard key={novel.id} novel={novel} goals={goalsOf(novel.id)} />
          ))}
        </section>
      ) : null}

      <section aria-labelledby="writing-badges" className="flex flex-col gap-4">
        <h2 id="writing-badges" className="ornament font-display text-lg">
          {t('Writing badges')}
        </h2>
        <ul className="flex flex-wrap justify-center gap-4">
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
      </section>

      <section aria-labelledby="participation-badges" className="flex flex-col gap-4">
        <h2 id="participation-badges" className="ornament font-display text-lg">
          {t('Participation badges')}
        </h2>
        <ul className="flex flex-wrap justify-center gap-4">
          {PARTICIPATION_BADGES.map((badge) => (
            <BadgeHex
              key={badge.id}
              kind="participation"
              badge={badge}
              earned={participation.has(badge.id)}
              label={t(badge.label)}
              description={t(badge.description)}
              statusText={participation.has(badge.id) ? t('Earned') : t('Not earned yet')}
            />
          ))}
        </ul>
      </section>

      <section aria-labelledby="favorites" className="sheet flex flex-col gap-3 rounded-sm p-6">
        <h2 id="favorites" className="font-display text-lg tracking-wide uppercase">
          {t('Favorites')}
        </h2>
        <p className="text-ink-soft italic">
          {favorites.length > 0
            ? favorites.map((book) => book.title).join(' · ')
            : t('No favorite books. Rate a book with 5 stars on your shelf.')}
        </p>
        <p className="text-ink-soft italic">
          {favoriteAuthors.length > 0 ? favoriteAuthors.join(' · ') : t('No favorite authors')}
        </p>
      </section>

      <p className="text-center text-sm">
        <a href="/api/export" className="underline underline-offset-4">
          {t('Download all my writing data (JSON)')}
        </a>
      </p>
    </div>
  );
}
