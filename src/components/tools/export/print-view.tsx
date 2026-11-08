'use client';

import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useI18n } from '@/components/i18n-provider';
import { blocksOf, type Chapter } from '@/lib/tools/export/text';

type PrintViewProps = {
  title: string;
  author: string;
  header: string;
  wordsLabel: string;
  chapters: Chapter[];
  onClose: () => void;
};

// CSS strings cannot hold a raw quote or backslash.
export const cssString = (text: string): string => `"${text.replace(/["\\\n]/g, ' ')}"`;

const printStyle = (header: string): string => `
.manuscript-print { position: fixed; inset: 0; z-index: 100; overflow: auto; background: #fff; color: #000; }
.manuscript-page { max-width: 42rem; margin: 0 auto; padding: 2rem 1rem 4rem; font-family: "Times New Roman", Times, serif; font-size: 12pt; line-height: 2; }
.manuscript-page p { margin: 0; text-indent: 1.25cm; }
.manuscript-page .plain { text-indent: 0; }
.manuscript-page .center { text-align: center; text-indent: 0; }
.manuscript-page .title-block { margin-top: 30vh; }
.manuscript-page h2 { font-size: 12pt; font-weight: normal; text-align: center; margin: 0; padding-top: 30vh; padding-bottom: 2em; }
@page { size: A4; margin: 2.5cm; @top-right { content: ${cssString(header)} " / " counter(page); font-family: "Times New Roman", serif; font-size: 12pt; } }
@page :first { @top-right { content: none; } }
@media print {
  body > *:not(.manuscript-print) { display: none !important; }
  .manuscript-print { position: static; overflow: visible; }
  .manuscript-controls { display: none !important; }
  .manuscript-page { max-width: none; padding: 0; }
  .manuscript-page .title-block { margin-top: 8cm; }
  .manuscript-page h2 { padding-top: 6cm; break-before: page; }
}`;

export function PrintView({ title, author, header, wordsLabel, chapters, onClose }: PrintViewProps) {
  const { t } = useI18n();

  useEffect(() => {
    window.print();
  }, []);

  return createPortal(
    <div className="manuscript-print" role="dialog" aria-modal="true" aria-label={t('Print view')}>
      <style>{printStyle(header)}</style>
      <div className="manuscript-controls sticky top-0 flex flex-wrap justify-end gap-3 bg-paper-deep p-3 font-display text-sm">
        <button
          type="button"
          onClick={() => window.print()}
          className="min-h-11 rounded-sm bg-accent px-4 font-semibold text-accent-ink">
          {t('Print or save as PDF')}
        </button>
        <button type="button" onClick={onClose} className="min-h-11 rounded-sm border border-rule px-4 text-ink">
          {t('Close')}
        </button>
      </div>
      <article className="manuscript-page">
        <p className="plain">{author}</p>
        <p className="plain">{wordsLabel}</p>
        <div className="title-block">
          <p className="center">{title}</p>
          <p className="center">{author}</p>
        </div>
        {chapters.map((chapter, chapterIndex) => (
          <section key={chapterIndex}>
            <h2>{chapter.title}</h2>
            {blocksOf(chapter.text).map((block, index) =>
              block.kind === 'break' ? (
                <p key={index} className="center">
                  #
                </p>
              ) : (
                <p key={index}>{block.text}</p>
              ),
            )}
          </section>
        ))}
      </article>
    </div>,
    document.body,
  );
}
