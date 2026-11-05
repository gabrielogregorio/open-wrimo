import { render, type RenderResult } from '@testing-library/react';
import type { ReactElement } from 'react';
import { I18nProvider } from '@/components/i18n-provider';
import type { Locale } from '@/lib/i18n/locales';

export const renderWithLocale = (element: ReactElement, locale: Locale = 'en-US'): RenderResult =>
  render(<I18nProvider locale={locale}>{element}</I18nProvider>);
