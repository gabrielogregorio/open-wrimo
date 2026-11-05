'use client';

import { useState } from 'react';
import { useI18n } from './i18n-provider';
import { SubmitButton } from './submit-button';

type ConfirmDeleteProps = { action: () => Promise<void>; label: string; question: string; confirmLabel: string };

export function ConfirmDelete({ action, label, question, confirmLabel }: ConfirmDeleteProps) {
  const { t } = useI18n();
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="text-sm text-danger underline underline-offset-4">
        {label}
      </button>
    );
  }

  return (
    <form action={action} className="flex flex-wrap items-center gap-3">
      <p className="text-sm">{question}</p>
      <SubmitButton variant="danger">{confirmLabel}</SubmitButton>
      <button type="button" onClick={() => setConfirming(false)} className="text-sm underline underline-offset-4">
        {t('Keep it')}
      </button>
    </form>
  );
}
