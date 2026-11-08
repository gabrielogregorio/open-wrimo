'use client';

import { useState, type DragEvent } from 'react';
import { fieldClasses } from '@/components/form-field';
import { useI18n } from '@/components/i18n-provider';
import { formatNumber } from '@/lib/i18n/format';
import type { ToolData } from '@/lib/tools/data';
import {
  ACCEPTED_EXTENSIONS,
  ConvertError,
  MAX_FILE_BYTES,
  convertFile,
  type ConvertFailure,
  type ConvertedBook,
} from '@/lib/tools/export/convert';
import { downloadFile } from '@/lib/tools/export/download';
import { EPUB_TYPE, buildEpub, randomUuid } from '@/lib/tools/export/epub';
import { slugify } from '@/lib/tools/export/text';
import { countWords } from '@/lib/tools/words';

type Converter = (fileName: string, bytes: Uint8Array) => Promise<ConvertedBook>;

type Loaded = { fileName: string; book: ConvertedBook };

const failureOf = (error: unknown): ConvertFailure => (error instanceof ConvertError ? error.reason : 'broken');

export default function ConverterTool({ convert = convertFile }: { data: ToolData; convert?: Converter }) {
  const { t, locale } = useI18n();
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [kindle, setKindle] = useState(true);
  const [reading, setReading] = useState(false);
  const [failure, setFailure] = useState<ConvertFailure | null>(null);
  const [done, setDone] = useState(false);
  const [dragging, setDragging] = useState(false);

  const failureMessages: Record<ConvertFailure, string> = {
    unsupported: t('This kind of file is not supported. Use a .docx, .odt, .md, .txt or .html file.'),
    broken: t('This file could not be read. It may be damaged or saved in another format.'),
    empty: t('No text was found in this file.'),
    'too-big': t('This file is larger than 20 MB.'),
  };

  const openFile = async (file: File): Promise<void> => {
    setFailure(null);
    setDone(false);

    if (file.size > MAX_FILE_BYTES) {
      setFailure('too-big');

      return;
    }

    setReading(true);

    try {
      const book = await convert(file.name, new Uint8Array(await file.arrayBuffer()));
      setLoaded({ fileName: file.name, book });
      setTitle(book.title);
      setAuthor(book.author);
    } catch (error) {
      setLoaded(null);
      setFailure(failureOf(error));
    } finally {
      setReading(false);
    }
  };

  const pickFiles = (files: FileList | null): void => {
    const file = files?.[0];

    if (file) {
      void openFile(file);
    }
  };

  const drop = (event: DragEvent<HTMLLabelElement>): void => {
    event.preventDefault();
    setDragging(false);
    pickFiles(event.dataTransfer.files);
  };

  const download = (book: ConvertedBook): void => {
    const finalTitle = title.trim() || book.title;
    const bytes = buildEpub({
      id: randomUuid(),
      title: finalTitle,
      author: author.trim() || t('Unknown author'),
      chapters: book.chapters,
      contentsLabel: t('Contents'),
      kindle,
      images: book.images,
    });
    downloadFile(bytes, `${slugify(finalTitle, 'livro')}.epub`, EPUB_TYPE);
    setDone(true);
  };

  const keptImages = loaded?.book.images?.length ?? 0;
  const skippedImages = loaded?.book.skippedImages ?? 0;
  const totalWords = loaded ? loaded.book.chapters.reduce((sum, chapter) => sum + countWords(chapter.text), 0) : 0;

  return (
    <div className="flex flex-col gap-5">
      <section className="sheet flex flex-col gap-3 rounded-sm p-5 sm:p-6">
        <label
          htmlFor="converter-file"
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={drop}
          className={`flex min-h-28 cursor-pointer flex-col items-center justify-center gap-1 rounded-sm border-2 border-dashed p-4 text-center ${
            dragging ? 'border-accent bg-accent/10' : 'border-ink-soft/40'
          }`}>
          <span className="font-display text-sm font-semibold">{t('Choose a file or drop it here')}</span>
          <span className="text-xs text-ink-soft">{t('.docx, .odt, .md, .txt or .html, up to 20 MB')}</span>
        </label>
        <input
          id="converter-file"
          type="file"
          accept={ACCEPTED_EXTENSIONS}
          onChange={(event) => pickFiles(event.target.files)}
          className="min-h-11 text-sm"
        />
        <p role="status" className="min-h-5 text-sm text-accent">
          {reading ? t('Reading the file…') : ''}
        </p>
        {failure ? (
          <p role="alert" className="text-sm text-red-700">
            {failureMessages[failure]}
          </p>
        ) : null}
        <p className="text-xs text-ink-soft">
          {t('Everything happens in this browser: the file is never sent anywhere, not even to our server.')}
        </p>
      </section>

      {loaded ? (
        <section className="sheet flex flex-col gap-4 rounded-sm p-5 sm:p-6">
          <p className="text-sm text-ink-soft">{t('File: {name}', { name: loaded.fileName })}</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <label htmlFor="converter-title" className="font-display text-sm font-semibold">
                {t('Book title')}
              </label>
              <input
                id="converter-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className={`${fieldClasses} min-h-11`}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="converter-author" className="font-display text-sm font-semibold">
                {t('Author name')}
              </label>
              <input
                id="converter-author"
                value={author}
                autoComplete="name"
                onChange={(event) => setAuthor(event.target.value)}
                className={`${fieldClasses} min-h-11`}
              />
            </div>
          </div>
          <p className="text-xs text-ink-soft">{t('Language of the book: Brazilian Portuguese.')}</p>
          <div className="flex flex-col gap-2">
            <h2 className="font-display text-sm font-semibold">
              {t('{count} chapters, {words} words', {
                count: loaded.book.chapters.length,
                words: formatNumber(locale, totalWords),
              })}
            </h2>
            <ol className="list-decimal pl-6 text-sm">
              {loaded.book.chapters.map((chapter, index) => (
                <li key={index}>
                  {chapter.title}{' '}
                  <span className="text-ink-soft">
                    ({t('{count} words', { count: formatNumber(locale, countWords(chapter.text)) })})
                  </span>
                </li>
              ))}
            </ol>
            {keptImages > 0 ? (
              <p className="text-sm">{t('{count} images kept', { count: formatNumber(locale, keptImages) })}</p>
            ) : null}
            {skippedImages > 0 ? (
              <p className="text-sm text-ink-soft">
                {t('{count} images left out (format e-readers do not show, or past the 50 MB limit)', {
                  count: formatNumber(locale, skippedImages),
                })}
              </p>
            ) : null}
          </div>
          <label className="flex min-h-11 items-center gap-3 text-sm">
            <input
              type="checkbox"
              checked={kindle}
              onChange={(event) => setKindle(event.target.checked)}
              className="size-5"
            />
            {t('Kindle-friendly (simple layout, the reader picks font and size)')}
          </label>
          <button
            type="button"
            onClick={() => download(loaded.book)}
            className="min-h-11 self-start rounded-sm bg-accent px-4 font-display text-sm font-semibold text-accent-ink">
            {t('Download .epub')}
          </button>
          <p className="min-h-5 text-sm text-accent">
            {done ? t('Your book was saved. Open it in an e-reader app or send it to your e-reader.') : ''}
          </p>
        </section>
      ) : null}

      <section className="sheet flex flex-col gap-2 rounded-sm p-5 text-sm sm:p-6">
        <h2 className="font-display font-semibold">{t('Reading on a Kindle')}</h2>
        <p>
          {t(
            'Send the .epub with Amazon’s Send to Kindle (the app, the website or your Kindle e-mail address). Kindle accepts EPUB since 2022, and the old MOBI format is no longer accepted.',
          )}
        </p>
        <p className="text-ink-soft">
          {t(
            'Bold, italic, images and tables are kept. Fonts, colors and sizes are left to the e-reader, and a .txt has no formatting to keep.',
          )}
        </p>
        <p className="text-ink-soft">
          {t(
            'Chapters come from the headings of the file. In a .txt, lines like “Capítulo 1” or “Prólogo” start a chapter.',
          )}
        </p>
      </section>
    </div>
  );
}
