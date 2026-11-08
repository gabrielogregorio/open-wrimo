import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { toolById, type ToolId } from '@/lib/tools/catalog';
import { getTranslator } from '@/server/i18n';
import { loadNotebook } from '@/server/notebook';
import { toolData } from '@/server/tools';
import { ToolLoader } from './tool-loader';

export async function generateMetadata({ params }: PageProps<'/write/tools/[tool]'>): Promise<Metadata> {
  const t = await getTranslator();
  const tool = toolById((await params).tool);

  return { title: tool ? t(tool.title) : t('Tools') };
}

export default async function ToolPage({ params }: PageProps<'/write/tools/[tool]'>) {
  const tool = toolById((await params).tool);

  if (!tool) {
    notFound();
  }

  const t = await getTranslator();
  const notebook = await loadNotebook();

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5">
      <Link href="/write/tools" className="font-display text-sm text-ink-soft underline underline-offset-4">
        {t('All tools')}
      </Link>
      <header className="flex flex-col gap-1">
        <h1 className="font-display text-3xl font-semibold sm:text-4xl">{t(tool.title)}</h1>
        <p className="text-ink-soft">{t(tool.description)}</p>
      </header>
      <ToolLoader id={tool.id as ToolId} data={toolData(notebook)} />
    </div>
  );
}
