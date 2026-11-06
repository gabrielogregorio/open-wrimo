import type { Metadata } from 'next';
import Link from 'next/link';
import { BookMockup } from '@/components/book-mockup';
import { fieldClasses } from '@/components/form-field';
import { getDatabase } from '@/lib/db/client';
import { formatDay, formatNumber } from '@/lib/i18n/format';
import {
  COMMUNITY_PAGE_SIZE,
  COMMUNITY_SORTS,
  createWritingRepository,
  type CommunitySort,
} from '@/lib/writing/repository';
import { getLocale, getTranslator } from '@/server/i18n';
import { requireUser } from '@/server/session';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslator();

  return { title: t('Community') };
}

const SORT_LABELS: Record<CommunitySort, string> = { words: 'Most words', recent: 'Wrote recently', name: 'Name' };

const single = (value: string | string[] | undefined): string => (Array.isArray(value) ? value[0] : (value ?? ''));

export default async function CommunityPage({ searchParams }: PageProps<'/write/community'>) {
  await requireUser();
  const t = await getTranslator();
  const locale = await getLocale();
  const params = await searchParams;
  const query = single(params.q).slice(0, 80);
  const sort: CommunitySort = COMMUNITY_SORTS.includes(single(params.sort) as CommunitySort)
    ? (single(params.sort) as CommunitySort)
    : 'words';
  const page = Math.max(1, Number.parseInt(single(params.page), 10) || 1);
  const { writers, total } = await createWritingRepository(await getDatabase()).listCommunity({ query, sort, page });
  const pages = Math.max(1, Math.ceil(total / COMMUNITY_PAGE_SIZE));
  const hrefFor = (next: Partial<{ sort: string; page: number }>): string => {
    const search = new URLSearchParams();

    if (query) {
      search.set('q', query);
    }

    search.set('sort', next.sort ?? sort);

    if ((next.page ?? 1) > 1) {
      search.set('page', String(next.page));
    }

    return `/write/community?${search.toString()}`;
  };

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-4xl font-semibold">{t('Community')}</h1>
        <p className="text-ink-soft">
          {t('Writers who opened their profile. {count} in all.', { count: formatNumber(locale, total) })}
        </p>
      </div>

      <form className="flex flex-wrap items-end gap-3" role="search">
        <div className="flex min-w-60 flex-1 flex-col gap-1">
          <label htmlFor="community-search" className="text-sm text-ink-soft">
            {t('Search by name or username')}
          </label>
          <input id="community-search" name="q" defaultValue={query} className={fieldClasses} />
        </div>
        <input type="hidden" name="sort" value={sort} />
        <button
          type="submit"
          className="rounded-sm bg-accent px-4 py-2 font-display text-sm font-semibold text-accent-ink">
          {t('Search')}
        </button>
      </form>

      <nav aria-label={t('Sort writers')} className="flex flex-wrap gap-2 text-sm">
        {COMMUNITY_SORTS.map((option) => (
          <Link
            key={option}
            href={hrefFor({ sort: option })}
            aria-current={sort === option ? 'page' : undefined}
            className={`rounded-full border px-3 py-1 ${sort === option ? 'border-accent bg-accent text-accent-ink' : 'border-rule hover:bg-paper-deep'}`}>
            {t(SORT_LABELS[option])}
          </Link>
        ))}
      </nav>

      {writers.length === 0 ? (
        <p className="sheet rounded-sm p-10 text-center text-ink-soft italic">{t('Nobody found.')}</p>
      ) : (
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {writers.map((writer) => (
            <li key={writer.username}>
              <Link
                href={`/u/${writer.username}`}
                className="sheet flex h-full items-start gap-4 rounded-sm p-5 transition hover:-translate-y-0.5 hover:shadow-lg">
                <div className="flex flex-1 flex-col gap-2">
                  <div className="flex items-center gap-3">
                    {writer.avatarUrl ? (
                      <img
                        src={writer.avatarUrl}
                        alt=""
                        className="h-14 w-14 rounded-full border-2 border-paper object-cover shadow"
                      />
                    ) : (
                      <span
                        aria-hidden="true"
                        className="flex h-14 w-14 items-center justify-center rounded-full bg-accent font-display text-2xl text-accent-ink shadow">
                        {writer.name.slice(0, 1).toUpperCase()}
                      </span>
                    )}
                    <span className="flex flex-col">
                      <span className="font-display text-lg leading-tight font-semibold">{writer.name}</span>
                      <span className="text-sm text-ink-soft">@{writer.username}</span>
                    </span>
                  </div>
                  {writer.location ? <p className="text-sm text-ink-soft">{writer.location}</p> : null}
                  <p className="text-sm">
                    <span className="font-display font-semibold">{formatNumber(locale, writer.words)}</span>{' '}
                    {t('words')} · {t('{count} public novels', { count: writer.novels })}
                  </p>
                  <p className="text-xs text-ink-soft">
                    {writer.lastWrote
                      ? t('Wrote on {date}', { date: formatDay(locale, writer.lastWrote) })
                      : t('No words logged yet')}
                  </p>
                </div>
                {writer.featured ? (
                  <span className="w-16 shrink-0" title={writer.featured.title}>
                    <BookMockup title={writer.featured.title} coverUrl={writer.featured.coverUrl} />
                  </span>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      )}

      {pages > 1 ? (
        <nav aria-label={t('Pages')} className="flex items-center justify-between font-display text-sm">
          {page > 1 ? (
            <Link href={hrefFor({ page: page - 1 })} className="underline underline-offset-4">
              {t('Previous page')}
            </Link>
          ) : (
            <span />
          )}
          <span className="text-ink-soft">{t('Page {page} of {total}', { page, total: pages })}</span>
          {page < pages ? (
            <Link href={hrefFor({ page: page + 1 })} className="underline underline-offset-4">
              {t('Next page')}
            </Link>
          ) : (
            <span />
          )}
        </nav>
      ) : null}
    </div>
  );
}
