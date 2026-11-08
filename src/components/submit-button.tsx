'use client';

import type { ReactNode } from 'react';
import { useFormStatus } from 'react-dom';
import { useI18n } from './i18n-provider';

type SubmitButtonProps = {
  children: ReactNode;
  /** What the button says while the form is sent; defaults to "Saving…". */
  pendingLabel?: ReactNode;
  variant?: 'primary' | 'quiet' | 'danger';
  /** Keeps the button off until the form is ready, such as a confirmation box being ticked. */
  disabled?: boolean;
};

const VARIANT_CLASSES = {
  primary: 'bg-accent text-accent-ink hover:brightness-110',
  quiet: 'border border-rule text-ink hover:bg-paper',
  danger: 'border border-danger text-danger hover:bg-paper',
} as const;

export function SubmitButton({ children, pendingLabel, variant = 'primary', disabled = false }: SubmitButtonProps) {
  const { pending } = useFormStatus();
  const { t } = useI18n();

  return (
    <button
      type="submit"
      disabled={pending || disabled}
      aria-disabled={pending || disabled}
      className={`relative inline-flex items-center justify-center rounded-sm px-4 py-2 font-display text-sm font-semibold tracking-wide transition disabled:cursor-not-allowed disabled:opacity-60 ${VARIANT_CLASSES[variant]}`}>
      {pending ? (pendingLabel ?? t('Saving…')) : children}
      {pending ? <span className="pending-ink" aria-hidden="true" /> : null}
    </button>
  );
}
