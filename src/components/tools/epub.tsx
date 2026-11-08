'use client';

import { useState } from 'react';
import { useI18n } from '@/components/i18n-provider';
import type { ToolData } from '@/lib/tools/data';
import { downloadFile } from '@/lib/tools/export/download';
import { EPUB_TYPE, buildEpub, randomUuid } from '@/lib/tools/export/epub';
import { slugify } from '@/lib/tools/export/text';
import { BookFields, useBook } from './export/book-setup';

export default function Epub({ data }: { data: ToolData }) {
  const { t } = useI18n();
  const book = useBook(data);
  const [done, setDone] = useState(false);

  const download = (): void => {
    const bytes = buildEpub({
      id: randomUuid(),
      title: book.title,
      author: book.author || t('Unknown author'),
      chapters: book.chapters,
      contentsLabel: t('Contents'),
    });
    downloadFile(bytes, `${slugify(book.title, 'livro')}.epub`, EPUB_TYPE);
    setDone(true);
  };

  return (
    <div className="flex flex-col gap-5">
      <BookFields book={book} data={data} />
      <section className="sheet flex flex-col gap-3 rounded-sm p-5 sm:p-6">
        <button
          type="button"
          onClick={download}
          disabled={book.chapters.length === 0}
          className="min-h-11 self-start rounded-sm bg-accent px-4 font-display text-sm font-semibold text-accent-ink disabled:opacity-50">
          {t('Download .epub')}
        </button>
        <p role="status" className="min-h-5 text-sm text-accent">
          {done ? t('Your book was saved. Open it in an e-reader app or send it to your e-reader.') : ''}
        </p>
        <p className="text-xs text-ink-soft">
          {t(
            'Each draft becomes a chapter, with a contents page. Kindle readers accept ePub sent through Send to Kindle.',
          )}
        </p>
      </section>
    </div>
  );
}
