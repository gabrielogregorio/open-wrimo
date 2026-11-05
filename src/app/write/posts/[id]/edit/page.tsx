import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { deletePostAction, savePostAction } from '@/app/actions/writing';
import { ConfirmDelete } from '@/components/confirm-delete';
import { PostForm } from '@/components/post-form';
import { getTranslator } from '@/server/i18n';
import { writingContext } from '@/server/session';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslator();

  return { title: t('Edit post') };
}

export default async function EditPostPage({ params }: PageProps<'/write/posts/[id]/edit'>) {
  const { id } = await params;
  const { writing, userId } = await writingContext();
  const post = await writing.getPost(userId, id);

  if (!post) {
    notFound();
  }

  const t = await getTranslator();

  return (
    <div className="sheet mx-auto flex max-w-2xl flex-col gap-8 rounded-sm p-8">
      <h1 className="font-display text-3xl font-semibold">{t('Edit post')}</h1>
      <PostForm
        action={savePostAction.bind(null, post.projectId, post.id)}
        cancelHref={`/write/novels/${post.projectId}?tab=posts`}
        post={post}
      />
      <ConfirmDelete
        action={deletePostAction.bind(null, post.projectId, post.id)}
        label={t('Delete this post')}
        question={t('Delete the post and its picture?')}
        confirmLabel={t('Yes, delete it')}
      />
    </div>
  );
}
