'use client';

import type { ReactNode } from 'react';
import { useFormStatus } from 'react-dom';
import { useI18n } from './i18n-provider';

type SubmitButtonProps = { children: ReactNode; variant?: 'primary' | 'quiet' | 'danger' };

const VARIANT_CLASSES = {
  primary: 'bg-accent text-accent-ink hover:brightness-110',
  quiet: 'border border-rule text-ink hover:bg-paper',
  danger: 'border border-danger text-danger hover:bg-paper',
} as const;

export function SubmitButton({ children, variant = 'primary' }: SubmitButtonProps) {
  const { pending } = useFormStatus();
  const { t } = useI18n();

  return (
    <button
      type="submit"
      disabled={pending}
      aria-disabled={pending}
      className={`relative inline-flex items-center justify-center rounded-sm px-4 py-2 font-display text-sm font-semibold tracking-wide transition disabled:opacity-60 ${VARIANT_CLASSES[variant]}`}>
      {pending ? t('Saving…') : children}
      {pending ? <span className="pending-ink" aria-hidden="true" /> : null}
    </button>
  );
}
