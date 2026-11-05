'use client';

import { useTransition } from 'react';
import { setLocaleAction, setThemeAction } from '@/app/actions/preferences';
import { LOCALE_QUERY, LOCALES } from '@/lib/i18n/locales';
import { THEMES, type Theme } from '@/lib/preferences/theme';
import { fieldClasses } from './form-field';
import { useI18n } from './i18n-provider';

const LOCALE_NAMES = { 'en-US': 'English', 'pt-BR': 'Português (Brasil)' } as const;

export const THEME_NAMES: Record<Theme, string> = {
  system: 'Follow the system',
  light: 'Paper',
  dark: 'Dark',
  night: 'Night (no blue light)',
};

const dropLanguageFromUrl = (): void => {
  const url = new URL(window.location.href);

  if (url.searchParams.has(LOCALE_QUERY)) {
    url.searchParams.delete(LOCALE_QUERY);
    window.history.replaceState(null, '', url);
  }
};

export function PreferencesMenu({ theme }: { theme: Theme }) {
  const { locale, t } = useI18n();
  const [, startTransition] = useTransition();

  const changeLocale = (value: string): void => {
    document.documentElement.lang = value;
    dropLanguageFromUrl();
    startTransition(() => setLocaleAction(value));
  };

  const changeTheme = (value: string): void => {
    document.documentElement.dataset.theme = value;
    startTransition(() => setThemeAction(value));
  };

  return (
    <div className="flex flex-wrap items-end gap-3 text-sm">
      <div className="flex flex-col gap-1">
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
      <div className="flex flex-col gap-1">
        <label htmlFor="preference-theme" className="text-xs text-ink-soft">
          {t('Theme')}
        </label>
        <select
          id="preference-theme"
          className={`${fieldClasses} py-1`}
          defaultValue={theme}
          onChange={(event) => changeTheme(event.target.value)}>
          {THEMES.map((option) => (
            <option key={option} value={option}>
              {t(THEME_NAMES[option])}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
