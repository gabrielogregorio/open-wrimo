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
    <div className="sheet mx-auto max-w-2xl rounded-sm p-8">
      <h1 className="mb-6 font-display text-3xl font-semibold">{t('Edit details')}</h1>
      <BookForm action={updateBookAction.bind(null, book.id)} book={book} />
    </div>
  );
}
