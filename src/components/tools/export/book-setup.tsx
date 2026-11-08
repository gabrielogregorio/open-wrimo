'use client';

import { useEffect, useState } from 'react';
import { fieldClasses } from '@/components/form-field';
import { useI18n } from '@/components/i18n-provider';
import { formatNumber } from '@/lib/i18n/format';
import type { ToolData } from '@/lib/tools/data';
import { draftsOf, liveDrafts, type Draft } from '@/lib/tools/export/drafts';
import type { Chapter } from '@/lib/tools/export/text';
import { localDb } from '@/lib/tools/local-db';
import { countWords } from '@/lib/tools/words';

export const AUTHOR_KEY = 'export:author';
const LOOSE = '';

export type Book = {
  drafts: Draft[] | null;
  source: string;
  title: string;
  author: string;
  chapters: Chapter[];
  wordCount: number;
  chooseSource: (source: string) => void;
  setTitle: (title: string) => void;
  setAuthor: (author: string) => void;
};

// The drafts of one novel (or the loose ones) as the chapters of a book, with its title and author.
export const useBook = (data: ToolData): Book => {
  const { t } = useI18n();
  const [drafts, setDrafts] = useState<Draft[] | null>(null);
  const [source, setSource] = useState(data.novels[0]?.id ?? LOOSE);
  const [customTitle, setCustomTitle] = useState<string | null>(null);
  const [author, setAuthorState] = useState('');

  useEffect(() => {
    let active = true;
    const db = localDb();
    void Promise.all([db.entries('draft:'), db.get<string>(AUTHOR_KEY)]).then(([entries, savedAuthor]) => {
      if (active) {
        setDrafts(liveDrafts(entries));
        setAuthorState(savedAuthor ?? '');
      }
    });

    return () => {
      active = false;
    };
  }, []);

  const novel = data.novels.find((item) => item.id === source);
  const chosen = draftsOf(drafts ?? [], novel ? novel.id : null);
  const chapters = chosen.map((draft, index) => ({
    title: draft.title.trim() || t('Chapter {number}', { number: index + 1 }),
    text: draft.text,
  }));

  return {
    drafts,
    source,
    title: customTitle ?? novel?.title ?? t('Loose drafts'),
    author,
    chapters,
    wordCount: chosen.reduce((sum, draft) => sum + countWords(draft.text), 0),
    chooseSource: (next) => {
      setSource(next);
      setCustomTitle(null);
    },
    setTitle: setCustomTitle,
    setAuthor: (next) => {
      setAuthorState(next);
      void localDb().set(AUTHOR_KEY, next);
    },
  };
};

export function BookFields({ book, data }: { book: Book; data: ToolData }) {
  const { t, locale } = useI18n();

  return (
    <section className="sheet flex flex-col gap-4 rounded-sm p-5 sm:p-6">
      <div className="flex flex-col gap-1">
        <label htmlFor="book-source" className="font-display text-sm font-semibold">
          {t('Drafts from')}
        </label>
        <select
          id="book-source"
          value={book.source}
          onChange={(event) => book.chooseSource(event.target.value)}
          className={`${fieldClasses} min-h-11`}>
          {data.novels.map((novel) => (
            <option key={novel.id} value={novel.id}>
              {novel.title}
            </option>
          ))}
          <option value={LOOSE}>{t('Loose drafts (no novel)')}</option>
        </select>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <label htmlFor="book-title" className="font-display text-sm font-semibold">
            {t('Book title')}
          </label>
          <input
            id="book-title"
            value={book.title}
            onChange={(event) => book.setTitle(event.target.value)}
            className={`${fieldClasses} min-h-11`}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="book-author" className="font-display text-sm font-semibold">
            {t('Author name')}
          </label>
          <input
            id="book-author"
            value={book.author}
            autoComplete="name"
            onChange={(event) => book.setAuthor(event.target.value)}
            className={`${fieldClasses} min-h-11`}
          />
        </div>
      </div>
      {book.drafts === null ? (
        <p className="text-sm text-ink-soft">{t('Loading your drafts…')}</p>
      ) : (
        <div className="flex flex-col gap-2">
          <h2 className="font-display text-sm font-semibold">
            {t('{count} chapters, {words} words', {
              count: book.chapters.length,
              words: formatNumber(locale, book.wordCount),
            })}
          </h2>
          {book.chapters.length > 0 ? (
            <ol className="list-decimal pl-6 text-sm">
              {book.chapters.map((chapter, index) => (
                <li key={index}>{chapter.title}</li>
              ))}
            </ol>
          ) : (
            <p className="text-sm text-ink-soft">
              {t('No drafts here yet. Write in the Drafts tool and they show up as chapters, in their order.')}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
