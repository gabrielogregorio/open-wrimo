'use client';

import { useActionState, useState } from 'react';
import type { FormState } from '@/lib/form';
import { MOODS } from '@/lib/writing/schema';
import { CoverShelf, type ShelfBook } from './cover-shelf';
import { FormAlert } from './form-alert';
import { FormField, fieldClasses } from './form-field';
import { useI18n } from './i18n-provider';
import { NumberInput } from './number-input';
import { SubmitButton } from './submit-button';
import { MOOD_LABELS } from './writing-labels';

export type GoalChoice = { id: string; label: string; unitLabel: string; total: number };
export type BookChoice = ShelfBook & { goals: GoalChoice[] };

type UpdateFormProps = {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  books: BookChoice[];
  selectedGoal: string;
  today: string;
  fixedCount?: number;
  compact?: boolean;
};

export function UpdateForm({ action, books, selectedGoal, today, fixedCount, compact = false }: UpdateFormProps) {
  const { t } = useI18n();
  const [state, formAction] = useActionState(action, {});
  const [goalId, setGoalId] = useState(state.values?.goal ?? selectedGoal);
  const bookIndex = Math.max(
    0,
    books.findIndex((book) => book.goals.some((choice) => choice.id === goalId)),
  );
  const book = books[bookIndex];
  const [mode, setMode] = useState<'add' | 'set'>('add');
  const goal = book.goals.find((choice) => choice.id === goalId) ?? book.goals[0];
  const typedCount = state.saved ? '' : (state.values?.count ?? '');
  const countDefault = fixedCount === undefined ? typedCount : String(fixedCount);
  const fieldError = (field: string): string | undefined => {
    const message = state.fieldErrors?.[field];

    return message ? t(message) : undefined;
  };

  return (
    <form action={formAction} className="grid gap-4" noValidate>
      <FormAlert message={state.error ? t(state.error) : undefined} />
      <input type="hidden" name="goal" value={goal.id} />
      <CoverShelf books={books} selected={bookIndex} onSelect={(index) => setGoalId(books[index].goals[0].id)} />
      {book.goals.length > 1 ? (
        <fieldset className="flex flex-wrap justify-center gap-2 text-sm">
          <legend className="sr-only">{t('Goal')}</legend>
          {book.goals.map((choice) => (
            <label
              key={choice.id}
              className={`cursor-pointer rounded-full border px-3 py-1 ${choice.id === goal.id ? 'border-accent bg-accent text-accent-ink' : 'border-rule'}`}>
              <input
                type="radio"
                className="sr-only"
                name="goal-choice"
                checked={choice.id === goal.id}
                onChange={() => setGoalId(choice.id)}
              />
              {choice.label}
            </label>
          ))}
        </fieldset>
      ) : (
        <p className="text-center text-sm text-ink-soft">{goal.label}</p>
      )}
      <fieldset className="flex flex-wrap gap-4 text-sm">
        <legend className="mb-1 font-display text-sm font-semibold">{t('How do you want to update?')}</legend>
        <label className="flex items-center gap-2">
          <input type="radio" name="mode" value="add" checked={mode === 'add'} onChange={() => setMode('add')} />
          {t('Add to what I had')}
        </label>
        <label className="flex items-center gap-2">
          <input type="radio" name="mode" value="set" checked={mode === 'set'} onChange={() => setMode('set')} />
          {t('Set my new total')}
        </label>
      </fieldset>
      <div className="grid gap-4 sm:grid-cols-2">
        <NumberInput
          key={`${state.saved ? 'saved' : 'open'}-${fixedCount ?? ''}-${mode}`}
          label={
            mode === 'add'
              ? t('How many {unit} did you write?', { unit: t(goal.unitLabel) })
              : t('Total {unit} so far', { unit: t(goal.unitLabel) })
          }
          name="count"
          placeholder="0"
          defaultValue={countDefault}
          hint={
            mode === 'set' ? t('Now: {total}', { total: new Intl.NumberFormat('pt-BR').format(goal.total) }) : undefined
          }
          error={fieldError('count')}
          maxDigits={6}
        />
        <FormField
          label={t('Day')}
          name="date"
          type="date"
          defaultValue={state.values?.date ?? today}
          max={today}
          error={fieldError('date')}
        />
      </div>
      {compact ? (
        <input type="hidden" name="place" value="" />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <label htmlFor="field-mood" className="font-display text-sm font-semibold">
              {t('How did it feel?')}
            </label>
            <select id="field-mood" name="mood" defaultValue="" className={fieldClasses}>
              <option value="">{t('Rather not say')}</option>
              {MOODS.map((mood) => (
                <option key={mood} value={mood}>
                  {t(MOOD_LABELS[mood])}
                </option>
              ))}
            </select>
          </div>
          <FormField label={t('Where did you write?')} name="place" defaultValue="" error={fieldError('place')} />
        </div>
      )}
      <div className="flex items-center gap-4">
        <SubmitButton>{t('Update')}</SubmitButton>
        <p role="status" className="text-sm text-ink-soft">
          {state.saved ? t('Progress saved.') : ''}
        </p>
      </div>
    </form>
  );
}
