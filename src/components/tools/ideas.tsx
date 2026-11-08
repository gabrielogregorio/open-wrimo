'use client';

import { useState } from 'react';
import { useI18n } from '@/components/i18n-provider';
import type { ToolData } from '@/lib/tools/data';
import { rerollPart, rollIdea, type Idea, type IdeaPart } from '@/lib/tools/story/ideas';
import { newEntryId, type Random } from '@/lib/tools/story/random';
import {
  ConfirmRemove,
  NovelPicker,
  buttonClasses,
  cardClasses,
  primaryClasses,
  useNovelChoice,
  useStoryList,
} from './story/story-ui';

type SavedIdea = Idea & { id: string };

const PARTS: IdeaPart[] = ['character', 'place', 'conflict'];

export default function Ideas({ data, random = Math.random }: { data: ToolData; random?: Random }) {
  const { t } = useI18n();
  const [novelId, setNovelId] = useNovelChoice(data.novels);
  const [saved, save] = useStoryList<SavedIdea>(novelId, 'ideas');
  // The first draw waits for a tap, so the server and the browser render the same page.
  const [idea, setIdea] = useState<Idea | null>(null);
  const titles: Record<IdeaPart, string> = { character: t('Character'), place: t('Place'), conflict: t('Conflict') };

  return (
    <div className="flex flex-col gap-5">
      <NovelPicker novels={data.novels} value={novelId} onChange={setNovelId} />
      <section className={cardClasses} aria-live="polite">
        {idea ? (
          PARTS.map((part) => (
            <div key={part} className="flex items-start justify-between gap-3 border-b border-rule pb-3 last:border-0">
              <p className="flex flex-col">
                <span className="font-display text-sm text-ink-soft">{titles[part]}</span>
                <span className="text-lg">{idea[part]}</span>
              </p>
              <button
                type="button"
                aria-label={t('Reroll {part}', { part: titles[part] })}
                onClick={() => setIdea(rerollPart(idea, part, random))}
                className={buttonClasses}>
                <span aria-hidden="true">↻</span>
              </button>
            </div>
          ))
        ) : (
          <p className="text-ink-soft">{t('Roll a character, a place and a conflict.')}</p>
        )}
        <div className="flex flex-wrap gap-2 pt-1">
          <button type="button" onClick={() => setIdea(rollIdea(random, idea ?? undefined))} className={primaryClasses}>
            {idea ? t('Reroll all') : t('Roll an idea')}
          </button>
          {idea ? (
            <button
              type="button"
              onClick={() => save([{ ...idea, id: newEntryId() }, ...saved])}
              className={buttonClasses}>
              {t('Save idea')}
            </button>
          ) : null}
        </div>
      </section>
      <section className={cardClasses}>
        <h2 className="font-display text-lg font-semibold">{t('Saved ideas')}</h2>
        {saved.length ? (
          <ul className="flex flex-col gap-3">
            {saved.map((item) => (
              <li key={item.id} className="flex flex-col gap-2 border-b border-rule pb-3 last:border-0">
                <p>{t('{character}, in {place}, {conflict}.', item)}</p>
                <ConfirmRemove
                  label={t('Delete')}
                  question={t('Delete this idea?')}
                  onConfirm={() => save(saved.filter((entry) => entry.id !== item.id))}
                />
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-ink-soft">{t('Ideas you save stay here, with the novel.')}</p>
        )}
      </section>
    </div>
  );
}
