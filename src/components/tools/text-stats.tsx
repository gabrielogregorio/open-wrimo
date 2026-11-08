'use client';

import { useId, useState } from 'react';
import { fieldClasses } from '@/components/form-field';
import { useI18n } from '@/components/i18n-provider';
import { textStats } from '@/lib/tools/review/text-stats';
import { ReviewTool, StatTile } from './review/review-tool';

function Stats({ text, limit }: { text: string; limit: number }) {
  const { t, locale } = useI18n();
  const stats = textStats(text, limit);
  const number = (value: number) => new Intl.NumberFormat(locale).format(value);

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label={t('Words')} value={number(stats.words)} />
        <StatTile label={t('Sentences')} value={number(stats.sentences)} />
        <StatTile label={t('Paragraphs')} value={number(stats.paragraphs)} />
        <StatTile label={t('Minutes to read')} value={number(stats.readingMinutes)} />
      </div>
      <section className="sheet flex flex-col gap-2 rounded-sm p-4">
        <h2 className="font-display text-lg font-semibold">{t('Most repeated words')}</h2>
        {stats.repeated.length ? (
          <ul className="flex flex-wrap gap-2">
            {stats.repeated.map((entry) => (
              <li key={entry.word} className="rounded-full border border-rule bg-paper px-3 py-1 text-sm">
                {entry.word} <span className="text-ink-soft tabular-nums">× {entry.count}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-ink-soft">{t('No word repeats yet.')}</p>
        )}
      </section>
      <section className="sheet flex flex-col gap-2 rounded-sm p-4">
        <h2 className="font-display text-lg font-semibold">
          {t('Sentences over {limit} words: {count}', { limit, count: stats.longSentences.length })}
        </h2>
        <ol className="flex flex-col gap-2">
          {stats.longSentences.map((sentence, index) => (
            <li key={index} className="border-l-2 border-ribbon pl-3 text-sm">
              {sentence.text} <span className="text-ink-soft">{t('({count} words)', { count: sentence.words })}</span>
            </li>
          ))}
        </ol>
      </section>
      <section className="sheet flex flex-col gap-2 rounded-sm p-4">
        <h2 className="font-display text-lg font-semibold">
          {t('Adverbs ending in -mente: {count}', { count: stats.adverbTotal })}
        </h2>
        <ul className="flex flex-wrap gap-2">
          {stats.adverbs.map((entry) => (
            <li key={entry.word} className="rounded-full border border-rule bg-paper px-3 py-1 text-sm">
              {entry.word} <span className="text-ink-soft tabular-nums">× {entry.count}</span>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}

export default function TextStats() {
  const { t } = useI18n();
  const id = useId();
  const [limitText, setLimitText] = useState('35');
  const limit = Math.max(1, Number(limitText) || 35);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <label htmlFor={id} className="font-display text-sm font-semibold">
          {t('Long sentence above (words)')}
        </label>
        <input
          id={id}
          type="text"
          inputMode="numeric"
          value={limitText}
          onChange={(event) => setLimitText(event.target.value.replace(/\D/g, '').slice(0, 3))}
          className={`${fieldClasses} min-h-11 w-20 tabular-nums`}
        />
      </div>
      <ReviewTool>{(text) => <Stats text={text} limit={limit} />}</ReviewTool>
    </div>
  );
}
