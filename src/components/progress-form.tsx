'use client';

import { useActionState } from 'react';
import type { FormState } from '@/lib/form';
import { FormAlert } from './form-alert';
import { FormField } from './form-field';
import { useI18n } from './i18n-provider';
import { SubmitButton } from './submit-button';

type ProgressFormProps = {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  currentPage: number;
  totalPages: number;
};

export function ProgressForm({ action, currentPage, totalPages }: ProgressFormProps) {
  const { t } = useI18n();
  const [state, formAction] = useActionState(action, {});
  const error = state.fieldErrors?.currentPage;

  return (
    <form action={formAction} className="flex flex-col gap-3" noValidate>
      <FormAlert message={state.error ? t(state.error) : undefined} />
      <div className="flex items-end gap-3">
        <div className="flex-1">
          <FormField
            key={currentPage}
            label={t('I am on page')}
            name="currentPage"
            type="number"
            inputMode="numeric"
            min={0}
            max={totalPages}
            defaultValue={state.values?.currentPage ?? String(currentPage)}
            error={error ? t(error) : undefined}
          />
        </div>
        <SubmitButton variant="quiet">{t('Update')}</SubmitButton>
      </div>
      <p role="status" className="min-h-5 text-sm text-ink-soft">
        {state.saved ? t('Progress saved.') : ''}
      </p>
    </form>
  );
}
