'use client';

import { useState } from 'react';
import { FormField } from './form-field';

export const toUsername = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+/, '')
    .slice(0, 20);

type UsernameInputProps = { label: string; hint: string; defaultValue?: string; error?: string };

export function UsernameInput({ label, hint, defaultValue = '', error }: UsernameInputProps) {
  const [value, setValue] = useState(toUsername(defaultValue));

  return (
    <FormField
      label={label}
      name="username"
      autoComplete="username"
      autoCapitalize="none"
      spellCheck={false}
      maxLength={20}
      value={value}
      onChange={(event) => setValue(toUsername(event.target.value))}
      onBlur={() => setValue(value.replace(/-+$/, ''))}
      hint={hint}
      error={error}
      required
    />
  );
}
