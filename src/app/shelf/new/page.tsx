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

  return <BookForm action={createBookAction} title={t('Add a book')} cancelHref="/shelf" />;
}
