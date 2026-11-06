'use client';

import { useCallback, useState } from 'react';
import type { FormState } from '@/lib/form';
import { GoalForm } from './goal-form';
import { useI18n } from './i18n-provider';

type NewGoalInlineProps = {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  today: string;
  defaultName: string;
};

export function NewGoalInline({ action, today, defaultName }: NewGoalInlineProps) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-fit rounded-sm bg-accent px-4 py-2 font-display text-sm font-semibold text-accent-ink hover:brightness-110">
        {t('New goal')}
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-4 rounded-sm border border-accent/40 bg-paper p-4">
      <p className="font-display text-sm tracking-wide text-accent uppercase">{t('New goal')}</p>
      <GoalForm action={action} today={today} defaultName={defaultName} onDone={close} />
    </div>
  );
}
