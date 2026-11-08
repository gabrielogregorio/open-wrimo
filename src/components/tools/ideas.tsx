'use client';

import { useId, useState } from 'react';
import { fieldClasses } from '@/components/form-field';
import { useI18n } from '@/components/i18n-provider';
import type { ToolData } from '@/lib/tools/data';
import { IDEA_GENRES, IDEA_TROPES } from '@/lib/tools/story/idea-data';
import {
  rerollPart,
  rollIdea,
  tropesFor,
  type Idea,
  type RolledIdea,
  type IdeaCatalog,
  type IdeaFilters,
  type IdeaPart,
} from '@/lib/tools/story/ideas';
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

const tagsOf = (item: Idea): string =>
  [item.genre?.name, ...(item.tropes ?? []).map((trope) => trope.name)].filter(Boolean).join(' · ');
type TextPart = Exclude<IdeaPart, 'tropes'>;

const CATALOG: IdeaCatalog = { genres: IDEA_GENRES, tropes: IDEA_TROPES };
const PARTS: TextPart[] = ['character', 'place', 'conflict'];
const MAX_WANTED = 3;
const TROPES_SHOWN = 18;

const chipClasses = (pressed: boolean): string =>
  `inline-flex min-h-11 items-center rounded-full border px-3 text-sm ${
    pressed ? 'border-accent bg-accent text-accent-ink' : 'border-rule bg-paper text-ink'
  }`;

export default function Ideas({ data, random = Math.random }: { data: ToolData; random?: Random }) {
  const { t } = useI18n();
  const genreSelect = useId();
  const [novelId, setNovelId] = useNovelChoice(data.novels);
  const [saved, save] = useStoryList<SavedIdea>(novelId, 'ideas');
  const [filters, setFilters] = useState<IdeaFilters>({ genreId: '', tropeIds: [] });
  const [showAll, setShowAll] = useState(false);
  // The first draw waits for a tap, so the server and the browser render the same page.
  const [idea, setIdea] = useState<RolledIdea | null>(null);
  const titles: Record<TextPart, string> = { character: t('Character'), place: t('Place'), conflict: t('Conflict') };
  const available = filters.genreId ? tropesFor(CATALOG, filters.genreId) : [...CATALOG.tropes];
  const shownTropes = showAll ? available : available.slice(0, TROPES_SHOWN);

  const chooseGenre = (genreId: string) => {
    const fitting = genreId ? tropesFor(CATALOG, genreId).map((trope) => trope.id) : null;
    setFilters({ genreId, tropeIds: filters.tropeIds.filter((id) => !fitting || fitting.includes(id)) });
  };

  const toggleTrope = (id: string) => {
    const tropeIds = filters.tropeIds.includes(id)
      ? filters.tropeIds.filter((item) => item !== id)
      : [...filters.tropeIds, id].slice(-MAX_WANTED);
    setFilters({ ...filters, tropeIds });
  };

  const sentence = (item: Idea): string =>
    t('{character}, in {place}, {conflict}.', {
      character: item.character,
      place: item.place,
      conflict: item.conflict,
    });

  return (
    <div className="flex flex-col gap-5">
      <NovelPicker novels={data.novels} value={novelId} onChange={setNovelId} />
      <section className={cardClasses} aria-labelledby="idea-filters">
        <h2 id="idea-filters" className="font-display text-lg font-semibold">
          {t('What kind of story?')}
        </h2>
        <div className="flex flex-col gap-1">
          <label htmlFor={genreSelect} className="font-display text-sm font-semibold">
            {t('Genre')}
          </label>
          <select
            id={genreSelect}
            value={filters.genreId}
            onChange={(event) => chooseGenre(event.target.value)}
            className={`${fieldClasses} min-h-11`}>
            <option value="">{t('Any genre')}</option>
            {CATALOG.genres.map((genre) => (
              <option key={genre.id} value={genre.id}>
                {genre.name}
              </option>
            ))}
          </select>
        </div>
        <fieldset className="flex flex-col gap-2">
          <legend className="font-display text-sm font-semibold">
            {t('Tropes you want (up to {count})', { count: MAX_WANTED })}
          </legend>
          <div className="flex flex-wrap gap-2">
            {shownTropes.map((trope) => (
              <button
                key={trope.id}
                type="button"
                aria-pressed={filters.tropeIds.includes(trope.id)}
                title={trope.description}
                onClick={() => toggleTrope(trope.id)}
                className={chipClasses(filters.tropeIds.includes(trope.id))}>
                {trope.name}
              </button>
            ))}
          </div>
          {available.length > TROPES_SHOWN ? (
            <button type="button" onClick={() => setShowAll(!showAll)} className={`${buttonClasses} self-start`}>
              {showAll ? t('Show fewer tropes') : t('See all {count} tropes', { count: available.length })}
            </button>
          ) : null}
        </fieldset>
      </section>
      <section className={cardClasses} aria-live="polite">
        {idea ? (
          <>
            <p className="font-display text-sm text-accent">{idea.genre?.name}</p>
            <div className="flex items-start justify-between gap-3 border-b border-rule pb-3">
              <ul className="flex flex-col gap-2">
                {idea.tropes.map((trope) => (
                  <li key={trope.id} className="flex flex-col">
                    <span className="font-display font-semibold">{trope.name}</span>
                    <span className="text-sm text-ink-soft">{trope.description}</span>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                aria-label={t('Reroll {part}', { part: t('Tropes') })}
                onClick={() => setIdea(rerollPart(CATALOG, idea, 'tropes', filters, random))}
                className={buttonClasses}>
                <span aria-hidden="true">↻</span>
              </button>
            </div>
            {PARTS.map((part) => (
              <div
                key={part}
                className="flex items-start justify-between gap-3 border-b border-rule pb-3 last:border-0">
                <p className="flex flex-col">
                  <span className="font-display text-sm text-ink-soft">{titles[part]}</span>
                  <span className="text-lg">{idea[part]}</span>
                </p>
                <button
                  type="button"
                  aria-label={t('Reroll {part}', { part: titles[part] })}
                  onClick={() => setIdea(rerollPart(CATALOG, idea, part, filters, random))}
                  className={buttonClasses}>
                  <span aria-hidden="true">↻</span>
                </button>
              </div>
            ))}
          </>
        ) : (
          <p className="text-ink-soft">{t('Roll a genre, two tropes, a character, a place and a conflict.')}</p>
        )}
        <div className="flex flex-wrap gap-2 pt-1">
          <button
            type="button"
            onClick={() => setIdea(rollIdea(CATALOG, filters, random, idea ?? undefined))}
            className={primaryClasses}>
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
                {tagsOf(item) ? <p className="font-display text-sm text-accent">{tagsOf(item)}</p> : null}
                <p>{sentence(item)}</p>
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
