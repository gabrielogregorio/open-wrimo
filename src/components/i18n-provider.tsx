'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import type { Locale } from '@/lib/i18n/locales';
import { translator, type Translate } from '@/lib/i18n/translate';

type I18nContextValue = { locale: Locale; t: Translate };

const I18nContext = createContext<I18nContextValue>({ locale: 'en-US', t: translator('en-US') });

export function I18nProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  const value = useMemo(() => ({ locale, t: translator(locale) }), [locale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export const useI18n = (): I18nContextValue => useContext(I18nContext);
