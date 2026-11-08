'use client';

import { useEffect, useId, useState, type FormEvent } from 'react';
import { fieldClasses } from '@/components/form-field';
import { useI18n } from '@/components/i18n-provider';
import type { ToolNovel } from '@/lib/tools/data';
import { localDb } from '@/lib/tools/local-db';
import { storyKey } from '@/lib/tools/story/random';

export const buttonClasses =
  'inline-flex min-h-11 min-w-11 items-center justify-center rounded-sm border border-rule bg-paper px-3 text-sm disabled:opacity-40';
export const primaryClasses =
  'inline-flex min-h-11 items-center justify-center rounded-sm bg-accent px-4 font-display text-sm font-semibold text-accent-ink disabled:opacity-40';
export const cardClasses = 'sheet flex flex-col gap-2 rounded-sm p-4';

// Which novel the story tools are working on; "" means loose notes outside any novel.
export const useNovelChoice = (novels: ToolNovel[]) => useState(novels[0]?.id ?? '');

export function NovelPicker({
  novels,
  value,
  onChange,
}: {
  novels: ToolNovel[];
  value: string;
  onChange: (novelId: string) => void;
}) {
  const { t } = useI18n();
  const id = useId();

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="font-display text-sm font-semibold">
        {t('Novel')}
      </label>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`${fieldClasses} min-h-11`}>
        {novels.map((novel) => (
          <option key={novel.id} value={novel.id}>
            {novel.title}
          </option>
        ))}
        <option value="">{t('No novel (loose notes)')}</option>
      </select>
    </div>
  );
}

// A list kept on this device under story:<novel>:<kind>. Items from another novel are never shown
// while the chosen one is still loading.
export const useStoryList = <T,>(novelId: string, kind: string): [T[], (items: T[]) => void] => {
  const key = storyKey(novelId, kind);
  const [state, setState] = useState<{ key: string; items: T[] }>({ key: '', items: [] });

  useEffect(() => {
    void localDb()
      .get<T[]>(key)
      .then((items) => setState({ key, items: items ?? [] }));
  }, [key]);

  const save = (items: T[]) => {
    setState({ key, items });
    void localDb().set(key, items);
  };

  return [state.key === key ? state.items : [], save];
};

export function ConfirmRemove({
  label,
  question,
  onConfirm,
}: {
  label: string;
  question: string;
  onConfirm: () => void;
}) {
  const { t } = useI18n();
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <button type="button" onClick={() => setConfirming(true)} className={`${buttonClasses} text-danger`}>
        {label}
      </button>
    );
  }

  return (
    <div role="group" aria-label={question} className="flex flex-wrap items-center gap-2">
      <span className="text-sm">{question}</span>
      <button type="button" onClick={onConfirm} className={`${buttonClasses} border-danger text-danger`}>
        {t('Yes, delete')}
      </button>
      <button type="button" onClick={() => setConfirming(false)} className={buttonClasses}>
        {t('Keep it')}
      </button>
    </div>
  );
}

export type EntryField = { name: string; label: string; multiline?: boolean; numeric?: boolean; required?: boolean };

type EntryFormProps = {
  fields: EntryField[];
  initial?: Record<string, string>;
  submitLabel: string;
  onSubmit: (values: Record<string, string>) => void;
  onCancel?: () => void;
};

// A small form for the story cards. It empties itself after adding and never posts anywhere.
export function EntryForm({ fields, initial = {}, submitLabel, onSubmit, onCancel }: EntryFormProps) {
  const { t } = useI18n();
  const prefix = useId();
  const [values, setValues] = useState(initial);
  const missing = fields.some((field) => field.required && !values[field.name]?.trim());

  const submit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit(Object.fromEntries(fields.map((field) => [field.name, values[field.name]?.trim() ?? ''])));
    setValues(initial);
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      {fields.map((field) => {
        const fieldId = `${prefix}-${field.name}`;
        const common = {
          id: fieldId,
          value: values[field.name] ?? '',
          onChange: (event: { target: { value: string } }) =>
            setValues((current) => ({ ...current, [field.name]: event.target.value })),
          className: fieldClasses,
        };

        return (
          <div key={field.name} className="flex flex-col gap-1">
            <label htmlFor={fieldId} className="font-display text-sm font-semibold">
              {field.label}
            </label>
            {field.multiline ? (
              <textarea rows={2} {...common} />
            ) : (
              <input type="text" inputMode={field.numeric ? 'numeric' : undefined} autoComplete="off" {...common} />
            )}
          </div>
        );
      })}
      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={missing} className={primaryClasses}>
          {submitLabel}
        </button>
        {onCancel ? (
          <button type="button" onClick={onCancel} className={buttonClasses}>
            {t('Cancel')}
          </button>
        ) : null}
      </div>
    </form>
  );
}
