'use client';

import { useI18n } from '@/components/i18n-provider';
import { readability, type ReadabilityBand } from '@/lib/tools/review/readability';
import { ReviewTool, StatTile } from './review/review-tool';

const BAND_LABELS: Record<ReadabilityBand, string> = {
  'very easy': 'Very easy',
  easy: 'Easy',
  hard: 'Hard',
  'very hard': 'Very hard',
};

const BAND_MEANING_LABELS: Record<ReadabilityBand, string> = {
  'very easy': 'Short sentences and short words. Reads like a children’s book or a fast thriller.',
  easy: 'Comfortable for most adult readers, like popular fiction and good journalism.',
  hard: 'Long sentences or long words. Fine for literary or dense prose, tiring for a fast scene.',
  'very hard': 'Reads like academic or legal text. Try splitting sentences and choosing shorter words.',
};

function Score({ text }: { text: string }) {
  const { t } = useI18n();
  const result = readability(text);

  if (!result) {
    return <p className="text-center text-ink-soft">{t('Paste a passage to see the analysis.')}</p>;
  }

  return (
    <>
      <section className="sheet flex flex-col gap-3 rounded-sm p-4">
        <p className="flex items-baseline gap-3">
          <span className="font-display text-5xl font-semibold tabular-nums">{result.score}</span>
          <span className="font-display text-xl">{t(BAND_LABELS[result.band])}</span>
        </p>
        <div className="h-3 overflow-hidden rounded-full bg-paper" aria-hidden="true">
          <div className="h-full bg-accent" style={{ width: `${result.score}%` }} />
        </div>
        <p>{t(BAND_MEANING_LABELS[result.band])}</p>
      </section>
      <div className="grid grid-cols-3 gap-3">
        <StatTile label={t('Words')} value={String(result.words)} />
        <StatTile label={t('Sentences')} value={String(result.sentences)} />
        <StatTile label={t('Syllables')} value={String(result.syllables)} />
      </div>
      <p className="text-sm text-ink-soft">
        {t(
          'Flesch reading ease adapted to Portuguese by Martins and others: 248.835 minus 1.015 times words per sentence minus 84.6 times syllables per word. From 0 (very hard) to 100 (very easy). Syllables are counted by a rule of thumb, so treat the score as a guide.',
        )}
      </p>
    </>
  );
}

export default function Readability() {
  return <ReviewTool>{(text) => <Score text={text} />}</ReviewTool>;
}
