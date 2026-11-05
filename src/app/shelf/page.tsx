import type { Metadata } from 'next';
import Link from 'next/link';
import { Shelf } from '@/components/book-spine';
import { STATUS_LABELS } from '@/components/book-status';
import { ProgressBar } from '@/components/progress-bar';
import { readingPercent } from '@/lib/books/progress';
import { BOOK_STATUSES } from '@/lib/books/schema';
import { parseShelfQuery, shelfHref } from '@/lib/books/shelf-query';
import { getTranslator } from '@/server/i18n';
import { bookRepository, requireUser } from '@/server/session';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslator();

  return { title: t('My shelf') };
}

const FILTERS = [undefined, ...BOOK_STATUSES] as const;

export default async function ShelfPage({ searchParams }: PageProps<'/shelf'>) {
  const user = await requireUser();
  const t = await getTranslator();
  const query = parseShelfQuery(await searchParams);
  const { books, hasNextPage, counts } = await (await bookRepository()).list(user.id, query);
  const reading = books.filter((book) => book.status === 'reading');

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-display text-sm tracking-[0.3em] text-accent uppercase">
            {t('Hello, {name}', { name: user.name })}
          </p>
          <h1 className="font-display text-4xl font-semibold">{t('My shelf')}</h1>
        </div>
        <Link
          href="/shelf/new"
          className="rounded-sm bg-accent px-4 py-2 font-display text-sm font-semibold text-accent-ink hover:brightness-110">
          {t('Add a book')}
        </Link>
      </div>

      <nav aria-label={t('Filter by status')}>
        <ul className="flex flex-wrap gap-2 font-display text-sm">
          {FILTERS.map((status) => {
            const active = query.status === status;

            return (
              <li key={status ?? 'all'}>
                <Link
                  href={shelfHref({ status, page: 1 })}
                  aria-current={active ? 'page' : undefined}
                  className={`inline-block rounded-full border px-4 py-1.5 ${active ? 'border-accent bg-accent text-accent-ink' : 'border-rule hover:bg-paper-deep'}`}>
                  {status ? t(STATUS_LABELS[status]) : t('All books')} ({counts[status ?? 'all']})
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {books.length === 0 ? (
        <div className="sheet rounded-sm p-10 text-center">
          <p className="font-display text-xl">{t('This shelf is still empty.')}</p>
          <p className="mt-2 text-ink-soft">{t('Add the book on your nightstand to begin.')}</p>
        </div>
      ) : (
        <Shelf books={books} label={t('Books on the shelf')} />
      )}

      {hasNextPage || query.page > 1 ? (
        <nav aria-label={t('Pages')} className="flex justify-between font-display text-sm">
          {query.page > 1 ? (
            <Link href={shelfHref({ ...query, page: query.page - 1 })} className="underline underline-offset-4">
              {t('Previous shelf')}
            </Link>
          ) : (
            <span />
          )}
          {hasNextPage ? (
            <Link href={shelfHref({ ...query, page: query.page + 1 })} className="underline underline-offset-4">
              {t('Next shelf')}
            </Link>
          ) : null}
        </nav>
      ) : null}

      {reading.length > 0 ? (
        <section aria-labelledby="reading-now" className="flex flex-col gap-4">
          <h2 id="reading-now" className="ornament font-display text-lg">
            {t('Reading now')}
          </h2>
          <ul className="grid gap-4 sm:grid-cols-2">
            {reading.map((book) => (
              <li key={book.id} className="sheet flex flex-col gap-3 rounded-sm p-5">
                <Link href={`/shelf/${book.id}`} className="font-display text-lg font-semibold hover:underline">
                  {book.title}
                </Link>
                <p className="text-sm text-ink-soft">{book.author}</p>
                <ProgressBar
                  currentPage={book.currentPage}
                  totalPages={book.totalPages}
                  label={t('Progress in {title}', { title: book.title })}
                />
                <p className="text-sm text-ink-soft">
                  {t('Page {page} of {total} · {percent}%', {
                    page: book.currentPage,
                    total: book.totalPages,
                    percent: readingPercent(book.currentPage, book.totalPages),
                  })}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
