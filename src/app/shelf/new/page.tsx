import type { Metadata } from 'next';
import { createBookAction } from '@/app/actions/books';
import { BookForm } from '@/components/book-form';
import { getTranslator } from '@/server/i18n';
import { requireUser } from '@/server/session';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslator();

  return { title: t('Add a book') };
}

export default async function NewBookPage() {
  await requireUser();
  const t = await getTranslator();

  return (
    <div className="sheet mx-auto max-w-2xl rounded-sm p-8">
      <h1 className="mb-6 font-display text-3xl font-semibold">{t('Add a book')}</h1>
      <BookForm action={createBookAction} />
    </div>
  );
}
