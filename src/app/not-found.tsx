import Link from 'next/link';
import { getTranslator } from '@/server/i18n';

export default async function NotFound() {
  const t = await getTranslator();

  return (
    <div className="sheet mx-auto max-w-lg rounded-sm p-10 text-center">
      <h1 className="font-display text-3xl font-semibold">{t('This page is missing from the book.')}</h1>
      <p className="mt-3 text-ink-soft">{t('It may have been removed, or it was never written.')}</p>
      <Link href="/" className="mt-6 inline-block font-display text-accent underline underline-offset-4">
        {t('Back to the start')}
      </Link>
    </div>
  );
}
