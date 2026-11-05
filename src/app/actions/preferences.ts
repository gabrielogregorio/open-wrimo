'use server';

import { cookies } from 'next/headers';
import { LOCALE_COOKIE, normalizeLocale } from '@/lib/i18n/locales';
import { PREFERENCE_MAX_AGE_SECONDS, THEME_COOKIE, isTheme } from '@/lib/preferences/theme';

const preferenceCookie = { path: '/', maxAge: PREFERENCE_MAX_AGE_SECONDS, sameSite: 'lax' as const };

export async function setLocaleAction(value: string): Promise<void> {
  const locale = normalizeLocale(value);

  if (locale) {
    (await cookies()).set(LOCALE_COOKIE, locale, preferenceCookie);
  }
}

export async function setThemeAction(value: string): Promise<void> {
  if (isTheme(value)) {
    (await cookies()).set(THEME_COOKIE, value, preferenceCookie);
  }
}
