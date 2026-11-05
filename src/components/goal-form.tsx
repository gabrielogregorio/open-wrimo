'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import type { FormState } from '@/lib/form';
import { addDays } from '@/lib/writing/dates';
import type { GoalView } from '@/lib/writing/repository';
import { GOAL_UNITS } from '@/lib/writing/schema';
import { FormAlert } from './form-alert';
import { FormField, fieldClasses } from './form-field';
import { useI18n } from './i18n-provider';
import { SubmitButton } from './submit-button';
import { UNIT_LABELS } from './writing-labels';

type GoalFormProps = {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  cancelHref: string;
  today: string;
  defaultName: string;
  goal?: GoalView;
};

export function GoalForm({ action, cancelHref, today, defaultName, goal }: GoalFormProps) {
  const { t } = useI18n();
  const [state, formAction] = useActionState(action, {});
  const values = state.values ?? {
    name: goal?.name ?? defaultName,
    unit: goal?.unit ?? 'words',
    target: String(goal?.target ?? 50000),
    startDate: goal?.startDate ?? today,
    endDate: goal?.endDate ?? addDays(today, 29),
  };
  const fieldError = (field: string): string | undefined => {
    const message = state.fieldErrors?.[field];

    return message ? t(message) : undefined;
  };

  return (
    <form action={formAction} className="grid gap-5 sm:grid-cols-2" noValidate>
      <div className="sm:col-span-2">
        <FormAlert message={state.error ? t(state.error) : undefined} />
      </div>
      <div className="sm:col-span-2">
        <FormField label={t('Goal name')} name="name" defaultValue={values.name} error={fieldError('name')} required />
      </div>
      <FormField
        label={t('Target')}
        name="target"
        type="number"
        inputMode="numeric"
        min={1}
        defaultValue={values.target}
        error={fieldError('target')}
        required
      />
      <div className="flex flex-col gap-1">
        <label htmlFor="field-unit" className="font-display text-sm font-semibold">
          {t('Counted in')}
        </label>
        <select id="field-unit" name="unit" defaultValue={values.unit} className={fieldClasses}>
          {GOAL_UNITS.map((unit) => (
            <option key={unit} value={unit}>
              {t(UNIT_LABELS[unit])}
            </option>
          ))}
        </select>
      </div>
      <FormField
        label={t('Starts on')}
        name="startDate"
        type="date"
        defaultValue={values.startDate}
        error={fieldError('startDate')}
      />
      <FormField
        label={t('Ends on')}
        name="endDate"
        type="date"
        defaultValue={values.endDate}
        error={fieldError('endDate')}
      />
      <div className="flex flex-wrap items-center gap-4 sm:col-span-2">
        <SubmitButton>{goal ? t('Save changes') : t('Create goal')}</SubmitButton>
        <Link href={cancelHref} className="font-display text-sm text-ink-soft underline underline-offset-4">
          {t('Cancel')}
        </Link>
      </div>
    </form>
  );
}
