import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { deleteNovelAction, updateNovelAction } from '@/app/actions/writing';
import { ConfirmDelete } from '@/components/confirm-delete';
import { NovelForm } from '@/components/novel-form';
import { getTranslator } from '@/server/i18n';
import { writingContext } from '@/server/session';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslator();

  return { title: t('Edit novel') };
}

export default async function EditNovelPage({ params, searchParams }: PageProps<'/write/novels/[id]/edit'>) {
  const { id } = await params;
  const { writing, userId } = await writingContext();
  const novel = await writing.getProject(userId, id);

  if (!novel) {
    notFound();
  }

  const t = await getTranslator();
  const coverRefused = (await searchParams).cover === 'refused';

  return (
    <div className="sheet mx-auto flex max-w-2xl flex-col gap-8 rounded-sm p-8">
      <h1 className="font-display text-3xl font-semibold">{t('Edit novel')}</h1>
      <NovelForm
        action={updateNovelAction.bind(null, novel.id)}
        cancelHref={`/write/novels/${novel.id}`}
        novel={novel}
        initialError={
          coverRefused ? t('The novel was created, but the cover was refused. Try another image.') : undefined
        }
      />
      <ConfirmDelete
        action={deleteNovelAction.bind(null, novel.id)}
        label={t('Delete this novel')}
        question={t('Delete the novel with its goals, progress and posts?')}
        confirmLabel={t('Yes, delete it')}
      />
    </div>
  );
}
