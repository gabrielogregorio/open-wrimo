'use client';

import Link from 'next/link';
import { useActionState, useEffect, useId, useState } from 'react';
import type { FormState } from '@/lib/form';
import { addDays } from '@/lib/writing/dates';
import type { GoalView } from '@/lib/writing/repository';
import { GOAL_PERIODS, GOAL_UNITS } from '@/lib/writing/schema';
import { FormAlert } from './form-alert';
import { FormField, fieldClasses } from './form-field';
import { useI18n } from './i18n-provider';
import { NumberInput } from './number-input';
import { SubmitButton } from './submit-button';
import { PERIOD_LABELS, UNIT_LABELS } from './writing-labels';

type GoalFormProps = {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  today: string;
  defaultName: string;
  goal?: GoalView;
  cancelHref?: string;
  onDone?: () => void;
};

export function GoalForm({ action, today, defaultName, goal, cancelHref, onDone }: GoalFormProps) {
  const { t } = useI18n();
  const prefix = useId();
  const [state, formAction] = useActionState(action, {});
  const values = state.values ?? {
    name: goal?.name ?? defaultName,
    unit: goal?.unit ?? 'words',
    target: String(goal?.target ?? 50000),
    startDate: goal?.startDate ?? today,
    endDate: goal?.endDate ?? addDays(today, 29),
    period: goal?.period ?? '',
  };
  const [period, setPeriod] = useState(values.period);
  const fieldError = (field: string): string | undefined => {
    const message = state.fieldErrors?.[field];

    return message ? t(message) : undefined;
  };

  useEffect(() => {
    if (state.saved) {
      onDone?.();
    }
  }, [state.saved, onDone]);

  const repeatOptions: [string, string][] = [
    ['', t('Between two dates')],
    ...GOAL_PERIODS.map((option): [string, string] => [option, t(PERIOD_LABELS[option])]),
  ];

  return (
    <form action={formAction} className="grid gap-4" noValidate>
      <FormAlert message={state.error ? t(state.error) : undefined} />
      <FormField
        id={`${prefix}-name`}
        label={t('Goal name')}
        name="name"
        defaultValue={values.name}
        error={fieldError('name')}
        required
      />
      <div className="grid grid-cols-[1fr_auto] items-end gap-3">
        <NumberInput
          id={`${prefix}-target`}
          label={t('Target')}
          name="target"
          defaultValue={values.target}
          error={fieldError('target')}
        />
        <select
          key={values.unit}
          name="unit"
          aria-label={t('Counted in')}
          defaultValue={values.unit}
          className={`${fieldClasses} w-auto`}>
          {GOAL_UNITS.map((unit) => (
            <option key={unit} value={unit}>
              {t(UNIT_LABELS[unit])}
            </option>
          ))}
        </select>
      </div>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 font-display text-sm font-semibold">{t('Repeats')}</legend>
        <input type="hidden" name="period" value={period} />
        <div className="flex flex-wrap gap-2 text-sm">
          {repeatOptions.map(([option, label]) => (
            <button
              key={option || 'dates'}
              type="button"
              aria-pressed={period === option}
              onClick={() => setPeriod(option)}
              className={`rounded-full border px-3 py-1 ${period === option ? 'border-accent bg-accent text-accent-ink' : 'border-rule hover:bg-paper'}`}>
              {label}
            </button>
          ))}
        </div>
      </fieldset>
      {period ? (
        <>
          <input type="hidden" name="startDate" value={values.startDate} />
          <input type="hidden" name="endDate" value={addDays(values.startDate, 365)} />
        </>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            id={`${prefix}-start`}
            label={t('Starts on')}
            name="startDate"
            type="date"
            defaultValue={values.startDate}
            error={fieldError('startDate')}
          />
          <FormField
            id={`${prefix}-end`}
            label={t('Ends on')}
            name="endDate"
            type="date"
            defaultValue={values.endDate}
            error={fieldError('endDate')}
          />
        </div>
      )}
      <div className="flex flex-wrap items-center gap-4">
        <SubmitButton>{goal ? t('Save changes') : t('Create goal')}</SubmitButton>
        {onDone ? (
          <button
            type="button"
            onClick={onDone}
            className="font-display text-sm text-ink-soft underline underline-offset-4">
            {t('Cancel')}
          </button>
        ) : (
          <Link
            href={cancelHref ?? '/write'}
            className="font-display text-sm text-ink-soft underline underline-offset-4">
            {t('Cancel')}
          </Link>
        )}
      </div>
    </form>
  );
}
