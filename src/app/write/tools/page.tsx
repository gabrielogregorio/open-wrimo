import type { Metadata } from 'next';
import { ToolsGrid } from '@/components/tools/tools-grid';
import { getTranslator } from '@/server/i18n';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslator();

  return { title: t('Tools') };
}

export default async function ToolsPage() {
  const t = await getTranslator();

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="font-display text-4xl font-semibold">{t('Tools')}</h1>
        <p className="text-ink-soft">
          {t('Everything here works in the browser and keeps your work on this device. Star the ones you use most.')}
        </p>
      </header>
      <ToolsGrid />
    </div>
  );
}
