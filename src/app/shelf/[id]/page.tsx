import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { addBookmarkAction, deleteBookAction, removeBookmarkAction, updateProgressAction } from '@/app/actions/books';
import { STATUS_LABELS } from '@/components/book-status';
import { Bookmarks } from '@/components/bookmarks';
import { DeleteBookForm } from '@/components/delete-book-form';
import { ProgressBar } from '@/components/progress-bar';
import { ProgressForm } from '@/components/progress-form';
import { readingPercent } from '@/lib/books/progress';
import { getTranslator } from '@/server/i18n';
import { bookRepository, requireUser } from '@/server/session';

const findBook = async (id: string) => {
  const user = await requireUser();

  return (await bookRepository()).get(user.id, id);
};

export async function generateMetadata({ params }: PageProps<'/shelf/[id]'>): Promise<Metadata> {
  const book = await findBook((await params).id);

  return { title: book?.title };
}

export default async function BookPage({ params }: PageProps<'/shelf/[id]'>) {
  const { id } = await params;
  const book = await findBook(id);

  if (!book) {
    notFound();
  }

  const t = await getTranslator();

  return (
    <article className="sheet open-book relative grid gap-10 rounded-sm p-8 md:grid-cols-2 md:gap-16 md:p-12">
      <span className="ribbon absolute -top-1 right-10 h-20 w-6" aria-hidden="true" />
      <div className="flex flex-col gap-5">
        <p className="font-display text-sm tracking-[0.3em] text-accent uppercase">{t(STATUS_LABELS[book.status])}</p>
        <div>
          <h1 className="font-display text-4xl leading-tight font-semibold text-balance">{book.title}</h1>
          <p className="mt-2 text-lg text-ink-soft italic">{t('by {author}', { author: book.author })}</p>
        </div>
        {book.rating ? <p className="text-sm">{t('{count} of 5 stars', { count: book.rating })}</p> : null}
        <div className="flex flex-col gap-2">
          <ProgressBar currentPage={book.currentPage} totalPages={book.totalPages} label={t('Reading progress')} />
          <p className="text-sm text-ink-soft">
            {t('Page {page} of {total} · {percent}%', {
              page: book.currentPage,
              total: book.totalPages,
              percent: readingPercent(book.currentPage, book.totalPages),
            })}
          </p>
        </div>
        <section aria-labelledby="notes-title" className="flex flex-col gap-2">
          <h2 id="notes-title" className="ornament font-display text-lg">
            {t('Notes')}
          </h2>
          {book.notes ? (
            <p className="leading-relaxed whitespace-pre-line first-letter:float-left first-letter:mr-2 first-letter:font-display first-letter:text-5xl first-letter:leading-none first-letter:text-accent">
              {book.notes}
            </p>
          ) : (
            <p className="text-ink-soft italic">{t('No notes yet.')}</p>
          )}
        </section>
        <div className="mt-auto flex flex-wrap items-center gap-5">
          <Link href={`/shelf/${book.id}/edit`} className="font-display text-sm underline underline-offset-4">
            {t('Edit details')}
          </Link>
          <DeleteBookForm action={deleteBookAction.bind(null, book.id)} />
        </div>
      </div>
      <div className="flex flex-col gap-8">
        <section aria-labelledby="progress-title" className="flex flex-col gap-3">
          <h2 id="progress-title" className="ornament font-display text-lg">
            {t('Where I stopped')}
          </h2>
          <ProgressForm
            action={updateProgressAction.bind(null, book.id)}
            currentPage={book.currentPage}
            totalPages={book.totalPages}
          />
        </section>
        <section aria-labelledby="bookmarks-title" className="flex flex-col gap-3">
          <h2 id="bookmarks-title" className="ornament font-display text-lg">
            {t('Bookmarks')}
          </h2>
          <Bookmarks
            bookmarks={book.bookmarks}
            addAction={addBookmarkAction.bind(null, book.id)}
            removeAction={removeBookmarkAction.bind(null, book.id)}
          />
        </section>
      </div>
    </article>
  );
}
