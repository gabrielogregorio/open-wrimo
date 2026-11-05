import Link from 'next/link';
import type { CSSProperties } from 'react';
import type { BookView } from '@/lib/books/repository';
import { spineHeightRem, spineTone, spineWidthRem } from '@/lib/books/spine';

export function BookSpine({ book, order = 0 }: { book: BookView; order?: number }) {
  return (
    <li className="spine-slot flex" style={{ '--order': order } as CSSProperties}>
      <Link
        href={`/shelf/${book.id}`}
        data-tone={spineTone(book.title)}
        style={{ width: `${spineWidthRem(book.totalPages)}rem`, height: `${spineHeightRem(book.title)}rem` }}
        className="spine flex items-center justify-between gap-2 rounded-t-sm px-1 py-3 font-display shadow-md">
        <span className="line-clamp-2 text-sm leading-tight font-semibold">{book.title}</span>{' '}
        <span className="truncate text-[0.7rem] opacity-90">{book.author}</span>
      </Link>
    </li>
  );
}

export function Shelf({ books, label }: { books: BookView[]; label: string }) {
  return (
    <section aria-label={label} className="relative">
      <ul className="flex min-h-56 items-end gap-1.5 overflow-x-auto px-4 pt-6">
        {books.map((book, order) => (
          <BookSpine key={book.id} book={book} order={order} />
        ))}
      </ul>
      <div className="shelf-board h-4 rounded-sm" aria-hidden="true" />
    </section>
  );
}
