'use client';

import { useState } from 'react';
import { FormField } from './form-field';

const withoutTrailingDashes = (value: string): string => {
  let end = value.length;

  while (end > 0 && value[end - 1] === '-') {
    end -= 1;
  }

  return value.slice(0, end);
};

const leadingTrimmed = (value: string): string => {
  let start = 0;

  while (value[start] === '-') {
    start += 1;
  }

  return value.slice(start);
};

export const toUsername = (value: string): string =>
  leadingTrimmed(
    value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .slice(0, 20),
  );

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
      onBlur={() => setValue(withoutTrailingDashes(value))}
      hint={hint}
      error={error}
      required
    />
  );
}
