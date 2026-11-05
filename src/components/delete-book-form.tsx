'use client';

import { useState } from 'react';
import { useI18n } from './i18n-provider';
import { SubmitButton } from './submit-button';

export function DeleteBookForm({ action }: { action: () => Promise<void> }) {
  const { t } = useI18n();
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="text-sm text-danger underline underline-offset-4">
        {t('Remove from shelf')}
      </button>
    );
  }

  return (
    <form action={action} className="flex flex-wrap items-center gap-3">
      <p className="text-sm">{t('Remove this book and its bookmarks?')}</p>
      <SubmitButton variant="danger">{t('Yes, remove it')}</SubmitButton>
      <button type="button" onClick={() => setConfirming(false)} className="text-sm underline underline-offset-4">
        {t('Keep it')}
      </button>
    </form>
  );
}
