'use client';

import { fieldClasses } from '@/components/form-field';
import { useI18n } from '@/components/i18n-provider';
import { formatNumber } from '@/lib/i18n/format';

type CountFieldProps = { id: string; label: string; value: number; onChange: (value: number) => void; hint?: string };

// A whole-number field that shows thousands separators while typing.
export function CountField({ id, label, value, onChange, hint }: CountFieldProps) {
  const { locale } = useI18n();

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="font-display text-sm font-semibold">
        {label}
      </label>
      <input
        id={id}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        value={formatNumber(locale, value)}
        onChange={(event) => onChange(Number(event.target.value.replace(/\D/g, '').slice(0, 9) || '0'))}
        aria-describedby={hint ? `${id}-hint` : undefined}
        className={`${fieldClasses} min-h-11 tabular-nums`}
      />
      {hint ? (
        <p id={`${id}-hint`} className="text-xs text-ink-soft">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
