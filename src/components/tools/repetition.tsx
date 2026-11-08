'use client';

import { useId, useState } from 'react';
import { fieldClasses } from '@/components/form-field';
import { useI18n } from '@/components/i18n-provider';
import { paragraphRepetitions } from '@/lib/tools/review/repetition';
import { ReviewTool } from './review/review-tool';

function Highlights({ text, threshold }: { text: string; threshold: number }) {
  const { t } = useI18n();
  const [selected, setSelected] = useState<string | null>(null);
  const paragraphs = paragraphRepetitions(text, threshold);

  return (
    <>
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <span className="rounded-sm bg-ribbon/20 px-2 py-1">{t('Repeated in the paragraph')}</span>
        <span className="rounded-sm bg-focus/25 px-2 py-1 outline outline-focus">{t('Word you tapped')}</span>
        <span className="text-ink-soft">{t('Tap any word to find it everywhere.')}</span>
      </div>
      <article className="sheet flex flex-col gap-4 rounded-sm p-4 font-serif leading-loose">
        {paragraphs.map((paragraph, paragraphIndex) => (
          <p key={paragraphIndex}>
            {paragraph.tokens.map((token, index) => {
              if (token.word === null) {
                return <span key={index}>{token.text}</span>;
              }

              const isSelected = token.word === selected;
              const classes = [
                'rounded-sm py-2',
                token.repeated ? 'bg-ribbon/20' : '',
                isSelected ? 'bg-focus/25 outline outline-focus' : '',
              ].join(' ');

              return (
                <button
                  key={index}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => setSelected(isSelected ? null : token.word)}
                  className={classes}>
                  {token.text}
                </button>
              );
            })}
          </p>
        ))}
      </article>
      <section className="sheet flex flex-col gap-2 rounded-sm p-4">
        <h2 className="font-display text-lg font-semibold">{t('Repeated words by paragraph')}</h2>
        <ul className="flex flex-col gap-1 text-sm">
          {paragraphs.map((paragraph, index) =>
            paragraph.repeated.length ? (
              <li key={index}>
                {t('Paragraph {number}:', { number: index + 1 })}{' '}
                {paragraph.repeated.map((entry) => `${entry.word} × ${entry.count}`).join(', ')}
              </li>
            ) : null,
          )}
        </ul>
      </section>
    </>
  );
}

export default function Repetition() {
  const { t } = useI18n();
  const id = useId();
  const [threshold, setThreshold] = useState(3);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <label htmlFor={id} className="font-display text-sm font-semibold">
          {t('Highlight from (times in a paragraph)')}
        </label>
        <select
          id={id}
          value={threshold}
          onChange={(event) => setThreshold(Number(event.target.value))}
          className={`${fieldClasses} min-h-11 w-20`}>
          {[2, 3, 4, 5].map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </div>
      <ReviewTool>{(text) => <Highlights text={text} threshold={threshold} />}</ReviewTool>
    </div>
  );
}
