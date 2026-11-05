import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { savePostAction } from '@/app/actions/writing';
import { PostForm } from '@/components/post-form';
import { getTranslator } from '@/server/i18n';
import { writingContext } from '@/server/session';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslator();

  return { title: t('Write a post') };
}

export default async function NewPostPage({ params }: PageProps<'/write/novels/[id]/posts/new'>) {
  const { id } = await params;
  const { writing, userId } = await writingContext();
  const novel = await writing.getProject(userId, id);

  if (!novel) {
    notFound();
  }

  const t = await getTranslator();

  return (
    <div className="sheet mx-auto max-w-2xl rounded-sm p-8">
      <h1 className="mb-6 font-display text-3xl font-semibold">
        {t('Write a post about {title}', { title: novel.title })}
      </h1>
      <PostForm
        action={savePostAction.bind(null, novel.id, undefined)}
        cancelHref={`/write/novels/${novel.id}?tab=posts`}
      />
    </div>
  );
}
