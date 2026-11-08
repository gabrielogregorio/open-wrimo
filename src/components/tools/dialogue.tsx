'use client';

import { useI18n } from '@/components/i18n-provider';
import { dialogueShare } from '@/lib/tools/review/dialogue';
import { ReviewTool, StatTile } from './review/review-tool';

function Share({ text }: { text: string }) {
  const { t } = useI18n();
  const share = dialogueShare(text);
  const narrationPercent = 100 - share.dialoguePercent;

  return (
    <>
      <section className="sheet flex flex-col gap-3 rounded-sm p-4">
        <div
          role="img"
          aria-label={t('{dialogue}% dialogue, {narration}% narration', {
            dialogue: share.dialoguePercent,
            narration: narrationPercent,
          })}
          className="flex h-8 overflow-hidden rounded-sm border border-rule bg-paper">
          <div className="h-full bg-accent" style={{ width: `${share.dialoguePercent}%` }} />
        </div>
        <div className="flex justify-between text-sm">
          <span>{t('Dialogue {percent}%', { percent: share.dialoguePercent })}</span>
          <span>{t('Narration {percent}%', { percent: narrationPercent })}</span>
        </div>
      </section>
      <div className="grid grid-cols-2 gap-3">
        <StatTile label={t('Words of dialogue')} value={String(share.dialogueWords)} />
        <StatTile label={t('Words of narration')} value={String(share.narrationWords)} />
      </div>
      <p className="text-sm text-ink-soft">
        {t(
          'Lines that open with a dash count as speech, and the narrator’s cut between dashes counts as narration. Text inside quotes also counts as speech.',
        )}
      </p>
    </>
  );
}

export default function Dialogue() {
  return <ReviewTool>{(text) => <Share text={text} />}</ReviewTool>;
}
