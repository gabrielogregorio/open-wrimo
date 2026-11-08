'use client';

import { useState } from 'react';
import { useI18n } from '@/components/i18n-provider';
import { formatNumber } from '@/lib/i18n/format';
import type { ToolData } from '@/lib/tools/data';
import { DOCX_TYPE, buildDocx } from '@/lib/tools/export/docx';
import { downloadFile } from '@/lib/tools/export/download';
import { slugify } from '@/lib/tools/export/text';
import { BookFields, useBook } from './export/book-setup';
import { PrintView } from './export/print-view';

// The running head: the author's surname and a short title of up to four words, in capitals.
export const runningHead = (author: string, title: string): string => {
  const surname = author.trim().split(/\s+/).slice(-1).join('');
  const shortTitle = title.trim().split(/\s+/).slice(0, 4).join(' ').toLocaleUpperCase('pt-BR');

  return [surname, shortTitle].filter(Boolean).join(' / ');
};

// Manuscripts state the length rounded to the nearest hundred.
export const roundedWords = (words: number): number => Math.max(100, Math.round(words / 100) * 100);

export default function Manuscript({ data }: { data: ToolData }) {
  const { t, locale } = useI18n();
  const book = useBook(data);
  const [printing, setPrinting] = useState(false);
  const header = runningHead(book.author, book.title);
  const wordsLabel = t('about {count} words', { count: formatNumber(locale, roundedWords(book.wordCount)) });
  const empty = book.chapters.length === 0;

  const downloadDocx = (): void => {
    const bytes = buildDocx(
      {
        title: book.title,
        author: book.author,
        shortTitle: header,
        chapters: book.chapters,
        wordCount: book.wordCount,
      },
      wordsLabel,
    );
    downloadFile(bytes, `${slugify(book.title, 'manuscrito')}.docx`, DOCX_TYPE);
  };

  return (
    <div className="flex flex-col gap-5">
      <BookFields book={book} data={data} />
      <section className="sheet flex flex-col gap-3 rounded-sm p-5 sm:p-6">
        <p className="text-sm text-ink-soft">
          {t(
            'Standard manuscript format: Times New Roman 12, double spacing, 2.5 cm margins, indented paragraphs, your name and the short title with the page number at the top, each chapter on a new page.',
          )}
        </p>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={downloadDocx}
            disabled={empty}
            className="min-h-11 rounded-sm bg-accent px-4 font-display text-sm font-semibold text-accent-ink disabled:opacity-50">
            {t('Download .docx')}
          </button>
          <button
            type="button"
            onClick={() => setPrinting(true)}
            disabled={empty}
            className="min-h-11 rounded-sm border border-rule px-4 font-display text-sm disabled:opacity-50">
            {t('Print or save as PDF')}
          </button>
        </div>
        <p className="text-xs text-ink-soft">
          {t('For a PDF, choose "Save as PDF" as the printer in the print window.')}
        </p>
      </section>
      {printing ? (
        <PrintView
          title={book.title}
          author={book.author}
          header={header}
          wordsLabel={wordsLabel}
          chapters={book.chapters}
          onClose={() => setPrinting(false)}
        />
      ) : null}
    </div>
  );
}
