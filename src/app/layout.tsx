import '@fontsource-variable/fraunces';
import '@fontsource-variable/literata';
import './globals.css';
import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { cookies } from 'next/headers';
import { I18nProvider } from '@/components/i18n-provider';
import { TimeZoneSync } from '@/components/time-zone-sync';
import { TIME_ZONE_COOKIE } from '@/lib/writing/dates';
import { getLocale, getTranslator } from '@/server/i18n';
import { SiteHeader } from './site-header';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslator();

  return {
    title: { default: 'Open Wrimo', template: '%s · Open Wrimo' },
    description: t('Write your novel, track every word and keep the books you read.'),
    applicationName: 'Open Wrimo',
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
          <TimeZoneSync saved={(await cookies()).get(TIME_ZONE_COOKIE)?.value} />
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
              {t('Open Wrimo · write every day, read slowly.')}
            </p>
          </footer>
        </I18nProvider>
      </body>
    </html>
  );
}
