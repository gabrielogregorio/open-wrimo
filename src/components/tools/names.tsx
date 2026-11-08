'use client';

import { useId, useState } from 'react';
import { fieldClasses } from '@/components/form-field';
import { useI18n } from '@/components/i18n-provider';
import type { ToolData } from '@/lib/tools/data';
import {
  DEFAULT_NAME_SOURCE,
  NAME_GENDERS,
  NAME_GROUPS,
  generateNames,
  nameOptions,
  nameSource,
  type NameGender,
  type NameGroup,
} from '@/lib/tools/story/names';
import type { Random } from '@/lib/tools/story/random';
import {
  NovelPicker,
  buttonClasses,
  cardClasses,
  primaryClasses,
  useNovelChoice,
  useStoryList,
} from './story/story-ui';

const NAME_GROUP_LABELS: Record<NameGroup, string> = {
  ancient: 'Antiquity',
  medieval: 'Middle Ages',
  'early-modern': 'Renaissance and the age of navigation',
  brazil: 'Brazil through time',
  asia: 'Asia through time',
  world: 'The world today',
  fantasy: 'Fantasy',
};

const GENDER_LABELS: Record<NameGender, string> = { female: 'Female', male: 'Male', any: 'Any' };

export default function Names({ data, random = Math.random }: { data: ToolData; random?: Random }) {
  const { t } = useI18n();
  const [novelId, setNovelId] = useNovelChoice(data.novels);
  const [favorites, saveFavorites] = useStoryList<string>(novelId, 'names');
  const [sourceId, setSourceId] = useState(DEFAULT_NAME_SOURCE);
  const [gender, setGender] = useState<NameGender>('any');
  const sourceSelect = useId();
  const genderSelect = useId();
  const [names, setNames] = useState<string[]>([]);
  const toggle = (name: string) =>
    saveFavorites(favorites.includes(name) ? favorites.filter((favorite) => favorite !== name) : [...favorites, name]);

  return (
    <div className="flex flex-col gap-5">
      <NovelPicker novels={data.novels} value={novelId} onChange={setNovelId} />
      <div className="grid gap-3 sm:grid-cols-[2fr_1fr]">
        <div className="flex flex-col gap-1">
          <label htmlFor={sourceSelect} className="font-display text-sm font-semibold">
            {t('Collection')}
          </label>
          <select
            id={sourceSelect}
            value={sourceId}
            onChange={(event) => setSourceId(event.target.value)}
            className={`${fieldClasses} min-h-11`}>
            {NAME_GROUPS.map((group) => (
              <optgroup key={group} label={t(NAME_GROUP_LABELS[group])}>
                {nameOptions(group).map((option) => (
                  <option key={option.id} value={option.id}>
                    {t(option.label)}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor={genderSelect} className="font-display text-sm font-semibold">
            {t('Gender')}
          </label>
          <select
            id={genderSelect}
            value={gender}
            onChange={(event) => setGender(event.target.value as NameGender)}
            className={`${fieldClasses} min-h-11`}>
            {NAME_GENDERS.map((option) => (
              <option key={option} value={option}>
                {t(GENDER_LABELS[option])}
              </option>
            ))}
          </select>
        </div>
      </div>
      <button
        type="button"
        onClick={() => setNames(generateNames(nameSource(sourceId), gender, random))}
        className={primaryClasses}>
        {t('Generate 10 names')}
      </button>
      {names.length ? (
        <ul className="grid gap-2 sm:grid-cols-2">
          {names.map((name) => {
            const saved = favorites.includes(name);

            return (
              <li key={name} className="sheet flex items-center justify-between gap-2 rounded-sm py-1 pr-1 pl-3">
                <span>{name}</span>
                <button
                  type="button"
                  aria-pressed={saved}
                  aria-label={t('Save {name}', { name })}
                  onClick={() => toggle(name)}
                  className={buttonClasses}>
                  <span aria-hidden="true">{saved ? '★' : '☆'}</span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
      <section className={cardClasses}>
        <h2 className="font-display text-lg font-semibold">{t('Saved names')}</h2>
        {favorites.length ? (
          <ul className="flex flex-col gap-1">
            {favorites.map((name) => (
              <li key={name} className="flex items-center justify-between gap-2">
                <span>{name}</span>
                <button
                  type="button"
                  aria-label={t('Remove {name}', { name })}
                  onClick={() => toggle(name)}
                  className={buttonClasses}>
                  ✕
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-ink-soft">{t('Tap the star next to a name to keep it here.')}</p>
        )}
      </section>
    </div>
  );
}
