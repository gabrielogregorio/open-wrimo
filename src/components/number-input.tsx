'use client';

import { useState } from 'react';
import { fieldClasses } from './form-field';
import { useI18n } from './i18n-provider';

type NumberInputProps = {
  name: string;
  label: string;
  defaultValue?: string;
  placeholder?: string;
  hint?: string;
  error?: string;
  maxDigits?: number;
  id?: string;
};

const digitsOf = (value: string, maxDigits: number): string =>
  value
    .replace(/\D/g, '')
    .replace(/^0+(?=\d)/, '')
    .slice(0, maxDigits);

export function NumberInput({
  name,
  label,
  defaultValue = '',
  placeholder,
  hint,
  error,
  maxDigits = 8,
  id: givenId,
}: NumberInputProps) {
  const { locale } = useI18n();
  const [digits, setDigits] = useState(() => digitsOf(defaultValue, maxDigits));
  const id = givenId ?? `field-${name}`;
  const shown = digits ? new Intl.NumberFormat(locale).format(Number(digits)) : '';
  const describedBy = [hint ? `${id}-hint` : '', error ? `${id}-error` : ''].filter(Boolean).join(' ');

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="font-display text-sm font-semibold">
        {label}
      </label>
      <input type="hidden" name={name} value={digits} />
      <input
        id={id}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        value={shown}
        placeholder={placeholder}
        onChange={(event) => setDigits(digitsOf(event.target.value, maxDigits))}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy || undefined}
        className={`${fieldClasses} tabular-nums`}
      />
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
