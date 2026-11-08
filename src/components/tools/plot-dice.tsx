'use client';

import { useI18n } from '@/components/i18n-provider';
import type { ToolData } from '@/lib/tools/data';
import { rollFace, rollTwist } from '@/lib/tools/story/plot-dice';
import { newEntryId, type Random } from '@/lib/tools/story/random';
import { NovelPicker, cardClasses, primaryClasses, useNovelChoice, useStoryList } from './story/story-ui';

// Rolls saved before rare twists existed have no `rare` flag.
type Roll = { id: string; face: number; twist: string; rare?: boolean };

const HISTORY_SIZE = 10;
const FACES = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];

// The die tumbles only for people who did not ask the system for less motion.
const DICE_STYLE = `
@keyframes plot-dice-roll {
  0% { transform: rotate(0deg) scale(0.7); }
  60% { transform: rotate(540deg) scale(1.15); }
  100% { transform: rotate(720deg) scale(1); }
}
@media (prefers-reduced-motion: no-preference) {
  .plot-dice-face { animation: plot-dice-roll 600ms cubic-bezier(0.2, 0.7, 0.2, 1) both; }
}
`;

export default function PlotDice({ data, random = Math.random }: { data: ToolData; random?: Random }) {
  const { t } = useI18n();
  const [novelId, setNovelId] = useNovelChoice(data.novels);
  const [history, save] = useStoryList<Roll>(novelId, 'dice');
  const latest = history.at(0);

  const roll = () => {
    const next: Roll = { id: newEntryId(), face: rollFace(random), ...rollTwist(random, latest?.twist) };
    save([next, ...history].slice(0, HISTORY_SIZE));
  };

  return (
    <div className="flex flex-col gap-5">
      <style>{DICE_STYLE}</style>
      <NovelPicker novels={data.novels} value={novelId} onChange={setNovelId} />
      <section className={`${cardClasses} items-center text-center`} aria-live="polite">
        <span key={latest?.id} aria-hidden="true" className="plot-dice-face inline-block text-7xl leading-none">
          {FACES[(latest?.face ?? 1) - 1]}
        </span>
        {latest?.rare ? (
          <p className="font-display text-xs font-semibold tracking-widest text-accent uppercase">
            <span aria-hidden="true">✦ </span>
            {t('Rare twist')}
          </p>
        ) : null}
        <p className="font-display text-xl">{latest ? latest.twist : t('What happens now?')}</p>
        <button type="button" onClick={roll} className={primaryClasses}>
          {t('Roll the die')}
        </button>
      </section>
      {history.length > 1 ? (
        <section className={cardClasses}>
          <h2 className="font-display text-lg font-semibold">{t('Last rolls')}</h2>
          <ol className="flex flex-col gap-2 text-sm">
            {history.slice(1).map((entry) => (
              <li key={entry.id} className="flex gap-2">
                <span aria-hidden="true">{FACES[entry.face - 1]}</span>
                <span>
                  {entry.twist}
                  {entry.rare ? <span className="ml-1 text-accent">({t('rare')})</span> : null}
                </span>
              </li>
            ))}
          </ol>
        </section>
      ) : null}
    </div>
  );
}
