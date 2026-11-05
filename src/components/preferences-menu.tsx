'use client';

import { useTransition } from 'react';
import { setLocaleAction } from '@/app/actions/preferences';
import { LOCALE_QUERY, LOCALES } from '@/lib/i18n/locales';
import { fieldClasses } from './form-field';
import { useI18n } from './i18n-provider';

const LOCALE_NAMES = { 'en-US': 'English', 'pt-BR': 'Português (Brasil)' } as const;

const dropLanguageFromUrl = (): void => {
  const url = new URL(window.location.href);

  if (url.searchParams.has(LOCALE_QUERY)) {
    url.searchParams.delete(LOCALE_QUERY);
    window.history.replaceState(null, '', url);
  }
};

export function PreferencesMenu() {
  const { locale, t } = useI18n();
  const [, startTransition] = useTransition();

  const changeLocale = (value: string): void => {
    document.documentElement.lang = value;
    dropLanguageFromUrl();
    startTransition(() => setLocaleAction(value));
  };

  return (
    <div className="flex flex-col gap-1 text-sm">
      <label htmlFor="preference-language" className="text-xs text-ink-soft">
        {t('Language')}
      </label>
      <select
        id="preference-language"
        className={`${fieldClasses} py-1`}
        defaultValue={locale}
        onChange={(event) => changeLocale(event.target.value)}>
        {LOCALES.map((option) => (
          <option key={option} value={option}>
            {LOCALE_NAMES[option]}
          </option>
        ))}
      </select>
    </div>
  );
}
