import type { Metadata } from 'next';
import { createNovelAction } from '@/app/actions/writing';
import { NovelForm } from '@/components/novel-form';
import { getTranslator } from '@/server/i18n';
import { requireUser } from '@/server/session';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslator();

  return { title: t('Create novel') };
}

export default async function NewNovelPage() {
  await requireUser();
  const t = await getTranslator();

  return (
    <div className="sheet mx-auto max-w-2xl rounded-sm p-8">
      <h1 className="mb-6 font-display text-3xl font-semibold">{t('Create novel')}</h1>
      <NovelForm action={createNovelAction} cancelHref="/write" />
    </div>
  );
}
