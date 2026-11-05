'use server';

import { cookies } from 'next/headers';
import { LOCALE_COOKIE, PREFERENCE_MAX_AGE_SECONDS, normalizeLocale } from '@/lib/i18n/locales';

export async function setLocaleAction(value: string): Promise<void> {
  const locale = normalizeLocale(value);

  if (locale) {
    (await cookies()).set(LOCALE_COOKIE, locale, { path: '/', maxAge: PREFERENCE_MAX_AGE_SECONDS, sameSite: 'lax' });
  }
}
