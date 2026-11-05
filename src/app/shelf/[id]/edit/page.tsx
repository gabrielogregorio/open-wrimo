import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { updateBookAction } from '@/app/actions/books';
import { BookForm } from '@/components/book-form';
import { getTranslator } from '@/server/i18n';
import { bookRepository, requireUser } from '@/server/session';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslator();

  return { title: t('Edit details') };
}

export default async function EditBookPage({ params }: PageProps<'/shelf/[id]/edit'>) {
  const user = await requireUser();
  const { id } = await params;
  const book = await (await bookRepository()).get(user.id, id);

  if (!book) {
    notFound();
  }

  const t = await getTranslator();

  return (
    <BookForm
      action={updateBookAction.bind(null, book.id)}
      book={book}
      title={t('Edit details')}
      cancelHref={`/shelf/${book.id}`}
    />
  );
}
