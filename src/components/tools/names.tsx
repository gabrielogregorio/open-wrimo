'use client';

import { useId, useState } from 'react';
import { fieldClasses } from '@/components/form-field';
import { useI18n } from '@/components/i18n-provider';
import type { ToolData } from '@/lib/tools/data';
import {
  NAME_ERAS,
  NAME_GENDERS,
  NAME_REGIONS,
  generateNames,
  type NameChoice,
  type NameEra,
  type NameGender,
  type NameRegion,
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

const ERA_LABELS: Record<NameEra, string> = {
  colonial: 'Colonial (1500 to 1822)',
  imperial: 'Empire (1822 to 1889)',
  'early-1900s': 'Early 1900s',
  midcentury: '1950s to 1970s',
  contemporary: 'Today',
  fantasy: 'Fantasy',
};

const REGION_LABELS: Record<NameRegion, string> = {
  brazil: 'Brazil',
  portugal: 'Portugal',
  anglophone: 'English-speaking',
  hispanic: 'Spanish-speaking',
  italian: 'Italian',
  japanese: 'Japanese',
  fantasy: 'Fantasy',
};

const GENDER_LABELS: Record<NameGender, string> = { female: 'Female', male: 'Male', any: 'Any' };

function ChoiceSelect<T extends string>({
  label,
  options,
  labels,
  value,
  onChange,
}: {
  label: string;
  options: readonly T[];
  labels: Record<T, string>;
  value: T;
  onChange: (value: T) => void;
}) {
  const { t } = useI18n();
  const id = useId();

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="font-display text-sm font-semibold">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value as T)}
        className={`${fieldClasses} min-h-11`}>
        {options.map((option) => (
          <option key={option} value={option}>
            {t(labels[option])}
          </option>
        ))}
      </select>
    </div>
  );
}

export default function Names({ data, random = Math.random }: { data: ToolData; random?: Random }) {
  const { t } = useI18n();
  const [novelId, setNovelId] = useNovelChoice(data.novels);
  const [favorites, saveFavorites] = useStoryList<string>(novelId, 'names');
  const [choice, setChoice] = useState<NameChoice>({ era: 'contemporary', region: 'brazil', gender: 'any' });
  const [names, setNames] = useState<string[]>([]);
  const toggle = (name: string) =>
    saveFavorites(favorites.includes(name) ? favorites.filter((favorite) => favorite !== name) : [...favorites, name]);

  return (
    <div className="flex flex-col gap-5">
      <NovelPicker novels={data.novels} value={novelId} onChange={setNovelId} />
      <div className="grid gap-3 sm:grid-cols-3">
        <ChoiceSelect
          label={t('Era')}
          options={NAME_ERAS}
          labels={ERA_LABELS}
          value={choice.era}
          onChange={(era) => setChoice({ ...choice, era })}
        />
        <ChoiceSelect
          label={t('Region')}
          options={NAME_REGIONS}
          labels={REGION_LABELS}
          value={choice.region}
          onChange={(region) => setChoice({ ...choice, region })}
        />
        <ChoiceSelect
          label={t('Gender')}
          options={NAME_GENDERS}
          labels={GENDER_LABELS}
          value={choice.gender}
          onChange={(gender) => setChoice({ ...choice, gender })}
        />
      </div>
      <button type="button" onClick={() => setNames(generateNames(choice, random))} className={primaryClasses}>
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
