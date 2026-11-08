'use client';

import { Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';
import { fieldClasses } from './form-field';
import { useI18n } from './i18n-provider';

type PasswordFieldProps = {
  label: string;
  autoComplete: 'new-password' | 'current-password';
  hint?: string;
  error?: string;
  /**
   * Keeps what was typed after a refused submit. Signing up keeps it, since the mistake is usually in
   * another field; signing in clears it, since a wrong password is the usual mistake there.
   */
  keepValue?: boolean;
};

/**
 * A password input with a button that shows or hides what was typed. A kept value lives in state, so it
 * survives React resetting the form after a refused submit; it never travels back from the server.
 */
export function PasswordField({ label, autoComplete, hint, error, keepValue = false }: PasswordFieldProps) {
  const { t } = useI18n();
  const [value, setValue] = useState('');
  const [visible, setVisible] = useState(false);
  const id = 'field-password';
  const describedBy = [hint ? `${id}-hint` : '', error ? `${id}-error` : ''].filter(Boolean).join(' ');

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="font-display text-sm font-semibold">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          name="password"
          type={visible ? 'text' : 'password'}
          autoComplete={autoComplete}
          {...(keepValue ? { value, onChange: (event) => setValue(event.target.value) } : {})}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy || undefined}
          className={`${fieldClasses} pr-11`}
          required
        />
        <button
          type="button"
          onClick={() => setVisible((shown) => !shown)}
          aria-label={visible ? t('Hide password') : t('Show password')}
          aria-pressed={visible}
          className="absolute inset-y-0 right-0 grid w-11 place-items-center text-ink-soft hover:text-ink">
          {visible ? <EyeOff className="h-5 w-5" aria-hidden="true" /> : <Eye className="h-5 w-5" aria-hidden="true" />}
        </button>
      </div>
      {hint ? (
        <p id={`${id}-hint`} className="text-xs text-ink-soft">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-error`} className="text-sm text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
