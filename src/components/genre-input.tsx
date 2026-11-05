'use client';

import { useState, type KeyboardEvent } from 'react';
import { MAX_GENRES } from '@/lib/writing/schema';
import { fieldClasses } from './form-field';
import { useI18n } from './i18n-provider';
import { GENRE_SUGGESTIONS } from './writing-labels';

type GenreInputProps = { defaultValue: string; error?: string };

const splitGenres = (value: string): string[] => [
  ...new Set(
    value
      .split(',')
      .map((genre) => genre.trim())
      .filter(Boolean),
  ),
];

export function GenreInput({ defaultValue, error }: GenreInputProps) {
  const { t } = useI18n();
  const [genres, setGenres] = useState(() => splitGenres(defaultValue));
  const [draft, setDraft] = useState('');

  const add = (value: string): void => {
    const next = splitGenres([...genres, value].join(','));
    setGenres(next.slice(0, MAX_GENRES));
    setDraft('');
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>): void => {
    if ((event.key === 'Enter' || event.key === ',') && draft.trim()) {
      event.preventDefault();
      add(draft);
    }

    if (event.key === 'Backspace' && !draft && genres.length > 0) {
      setGenres(genres.slice(0, -1));
    }
  };

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor="field-genre-draft" className="font-display text-sm font-semibold">
        {t('Genres')}
      </label>
      <input type="hidden" name="genres" value={genres.join(', ')} />
      <div className={`${fieldClasses} flex flex-wrap items-center gap-2`}>
        {genres.map((genre) => (
          <span
            key={genre}
            className="inline-flex items-center gap-1 rounded-sm border border-rule bg-paper-deep px-2 py-0.5 text-sm">
            <button
              type="button"
              onClick={() => setGenres(genres.filter((item) => item !== genre))}
              aria-label={t('Remove genre {genre}', { genre })}
              className="text-ink-soft hover:text-danger">
              ×
            </button>
            {genre}
          </span>
        ))}
        <input
          id="field-genre-draft"
          list="genre-suggestions"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={onKeyDown}
          onBlur={() => draft.trim() && add(draft)}
          disabled={genres.length >= MAX_GENRES}
          aria-describedby={error ? 'field-genres-hint field-genres-error' : 'field-genres-hint'}
          aria-invalid={error ? true : undefined}
          className="min-w-32 flex-1 bg-transparent outline-none"
        />
      </div>
      <datalist id="genre-suggestions">
        {GENRE_SUGGESTIONS.map((genre) => (
          <option key={genre} value={t(genre)} />
        ))}
      </datalist>
      <p id="field-genres-hint" className="text-xs text-ink-soft">
        {t('Press Enter after each genre. Up to 10.')}
      </p>
      {error ? (
        <p id="field-genres-error" className="text-sm text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
