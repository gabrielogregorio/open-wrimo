import type { Metadata } from 'next';
import Link from 'next/link';
import { RichText } from '@/components/rich-text';
import { formatDay } from '@/lib/i18n/format';
import { getLocale, getTranslator } from '@/server/i18n';
import { loadNotebook } from '@/server/notebook';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslator();

  return { title: t('Posts') };
}

export default async function PostsPage() {
  const notebook = await loadNotebook();
  const t = await getTranslator();
  const locale = await getLocale();
  const posts = await notebook.context.writing.listPosts(notebook.context.userId);
  const titles = new Map(notebook.projects.map((project) => [project.id, project.title]));

  return (
    <div className="flex flex-col gap-8">
      <h1 className="font-display text-4xl font-semibold">{t('Posts')}</h1>
      {posts.length === 0 ? (
        <p className="sheet rounded-sm p-10 text-center text-ink-soft italic">
          {t('No posts yet. Open a novel and write the first one.')}
        </p>
      ) : null}
      {posts.map((post) => (
        <article key={post.id} className="sheet flex flex-col gap-3 rounded-sm p-6">
          <header className="flex flex-col gap-1">
            <Link
              href={`/write/novels/${post.projectId}?tab=posts`}
              className="text-sm text-accent underline-offset-4 hover:underline">
              {titles.get(post.projectId)}
            </Link>
            <h2 className="font-display text-2xl">{post.title}</h2>
            <p className="text-sm text-ink-soft">{formatDay(locale, post.createdAt.slice(0, 10))}</p>
          </header>
          {post.imageUrl ? (
            <img src={post.imageUrl} alt="" className="max-h-96 w-fit rounded-sm object-contain" />
          ) : null}
          <RichText html={post.body} />
        </article>
      ))}
    </div>
  );
}
