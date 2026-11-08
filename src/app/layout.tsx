import '@fontsource-variable/fraunces';
import '@fontsource-variable/literata';
import './globals.css';
import { Code2 } from 'lucide-react';
import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { cookies } from 'next/headers';
import { I18nProvider } from '@/components/i18n-provider';
import { TimeZoneSync } from '@/components/time-zone-sync';
import { TIME_ZONE_COOKIE } from '@/lib/writing/dates';
import { getLocale, getTranslator } from '@/server/i18n';
import { REPOSITORY_URL, SITE_DESCRIPTION, SITE_NAME, siteUrl } from '@/server/seo';
import { SiteHeader } from './site-header';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslator();

  const description = t(SITE_DESCRIPTION);

  return {
    metadataBase: siteUrl(),
    title: { default: SITE_NAME, template: `%s · ${SITE_NAME}` },
    description,
    applicationName: SITE_NAME,
    keywords: ['escrita', 'romance', 'NaNoWriMo', 'metas de escrita', 'contador de palavras', 'escritores', 'sprint'],
    formatDetection: { telephone: false, email: false, address: false },
    openGraph: { type: 'website', siteName: SITE_NAME, locale: 'pt_BR', title: SITE_NAME, description, url: '/' },
    twitter: { card: 'summary_large_image', title: SITE_NAME, description },
    appleWebApp: { title: SITE_NAME, capable: true, statusBarStyle: 'default' },
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
            <div className="mx-auto flex max-w-5xl flex-col items-center gap-1 px-4 py-6 text-center text-sm text-ink-soft">
              <p className="italic">{t('Open Wrimo · write every day, read slowly.')}</p>
              <a
                href={REPOSITORY_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center gap-1.5 font-display underline underline-offset-4 hover:text-accent">
                <Code2 className="h-4 w-4" aria-hidden="true" />
                {t('Contribute on GitHub')}
                <span className="sr-only">{t('(opens in a new tab)')}</span>
              </a>
            </div>
          </footer>
        </I18nProvider>
      </body>
    </html>
  );
}
