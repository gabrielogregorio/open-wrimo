'use client';

import type { KeyboardEvent } from 'react';
import { useI18n } from './i18n-provider';
import { LogoMark } from './logo';

export type ShelfBook = { projectId: string; title: string; coverUrl: string | null; statusLabel: string };

const STEP_REM = 7.5;

type CoverShelfProps = { books: ShelfBook[]; selected: number; onSelect: (index: number) => void };

export function CoverShelf({ books, selected, onSelect }: CoverShelfProps) {
  const { t } = useI18n();
  const move = (step: number): void => onSelect(Math.min(books.length - 1, Math.max(0, selected + step)));

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    const steps: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, Home: -books.length, End: books.length };

    if (event.key in steps) {
      event.preventDefault();
      move(steps[event.key]);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div
        role="radiogroup"
        aria-label={t('Which book did you write in?')}
        onKeyDown={onKeyDown}
        className="cover-shelf relative h-72 overflow-hidden rounded-sm">
        {books.map((book, index) => {
          const offset = index - selected;
          const distance = Math.abs(offset);

          return (
            <button
              key={book.projectId}
              type="button"
              role="radio"
              aria-checked={offset === 0}
              aria-label={`${book.title} · ${book.statusLabel}`}
              tabIndex={offset === 0 ? 0 : -1}
              onClick={() => onSelect(index)}
              className="cover-shelf-book absolute top-4 left-1/2 aspect-[2/3] w-36"
              style={{
                transform: `translateX(calc(-50% + ${offset * STEP_REM}rem)) translateZ(${-distance * 90}px) rotateY(${offset === 0 ? 0 : offset < 0 ? 42 : -42}deg) scale(${offset === 0 ? 1.08 : 0.9})`,
                zIndex: books.length - distance,
                opacity: distance > 3 ? 0 : 1,
                filter: offset === 0 ? 'none' : 'brightness(0.82) saturate(0.85)',
              }}>
              <span className="block h-full w-full overflow-hidden rounded-sm shadow-xl">
                {book.coverUrl ? (
                  <img src={book.coverUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="book-cover-plain flex h-full w-full flex-col items-center justify-center gap-2 p-3 text-center">
                    <LogoMark className="h-8 w-8" />
                    <span className="font-display text-sm font-semibold">{book.title}</span>
                  </span>
                )}
              </span>
            </button>
          );
        })}
        <div className="shelf-board absolute right-0 bottom-0 left-0 h-4" aria-hidden="true" />
      </div>
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => move(-1)}
          disabled={selected === 0}
          aria-label={t('Previous book')}
          className="rounded-full border border-rule px-3 py-1 text-lg disabled:opacity-30">
          ‹
        </button>
        <p className="text-center">
          <span className="block font-display text-xl font-semibold">{books[selected]?.title}</span>
          <span className="text-sm text-ink-soft">{books[selected]?.statusLabel}</span>
        </p>
        <button
          type="button"
          onClick={() => move(1)}
          disabled={selected === books.length - 1}
          aria-label={t('Next book')}
          className="rounded-full border border-rule px-3 py-1 text-lg disabled:opacity-30">
          ›
        </button>
      </div>
    </div>
  );
}
