import '@fontsource-variable/fraunces';
import '@fontsource-variable/literata';
import './globals.css';
import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { I18nProvider } from '@/components/i18n-provider';
import { getLocale, getTranslator } from '@/server/i18n';
import { SiteHeader } from './site-header';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslator();

  return {
    title: { default: 'Folio', template: '%s · Folio' },
    description: t('A calm reading log: keep your shelf, track pages and bookmark passages.'),
    applicationName: 'Folio',
  };
}

export const viewport: Viewport = {
  themeColor: '#f7f1e3',
  colorScheme: 'light',
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const locale = await getLocale();
  const t = await getTranslator();

  return (
    <html lang={locale}>
      <body className="flex flex-col antialiased">
        <I18nProvider locale={locale}>
          <a
            href="#content"
            className="sr-only rounded-sm bg-accent px-3 py-2 text-accent-ink focus:not-sr-only focus:absolute focus:top-2 focus:left-2">
            {t('Skip to content')}
          </a>
          <SiteHeader />
          <main id="content" className="mx-auto w-full max-w-5xl flex-1 px-4 py-10">
            {children}
          </main>
          <footer className="border-t border-rule">
            <p className="mx-auto max-w-5xl px-4 py-6 text-center text-sm text-ink-soft italic">
              {t('Folio · read slowly, remember more.')}
            </p>
          </footer>
        </I18nProvider>
      </body>
    </html>
  );
}
