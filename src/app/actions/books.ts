'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { BOOK_FIELDS } from '@/lib/books/schema';
import { addBookmark, recordProgress, saveBook } from '@/lib/books/service';
import { formValues, type FormState } from '@/lib/form';
import { bookRepository, requireUser } from '@/server/session';

const context = async () => {
  const user = await requireUser();

  return { books: await bookRepository(), userId: user.id, now: new Date() };
};

export async function createBookAction(_previous: FormState, formData: FormData): Promise<FormState> {
  const values = formValues(formData, BOOK_FIELDS);
  const result = await saveBook(await context(), values);

  if (!result.bookId) {
    return { ...result, values };
  }

  redirect(`/shelf/${result.bookId}`);
}

export async function updateBookAction(bookId: string, _previous: FormState, formData: FormData): Promise<FormState> {
  const values = formValues(formData, BOOK_FIELDS);
  const result = await saveBook(await context(), values, bookId);

  if (!result.bookId) {
    return { ...result, values };
  }

  revalidatePath(`/shelf/${bookId}`);
  redirect(`/shelf/${bookId}`);
}

export async function updateProgressAction(
  bookId: string,
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const values = formValues(formData, ['currentPage']);
  const result = await recordProgress(await context(), bookId, values);
  revalidatePath(`/shelf/${bookId}`);

  return { ...result, values };
}

export async function addBookmarkAction(bookId: string, _previous: FormState, formData: FormData): Promise<FormState> {
  const values = formValues(formData, ['page', 'note']);
  const result = await addBookmark(await context(), bookId, values);
  revalidatePath(`/shelf/${bookId}`);

  return result.saved ? result : { ...result, values };
}

export async function removeBookmarkAction(bookId: string, bookmarkId: string): Promise<void> {
  const { books, userId, now } = await context();
  await books.removeBookmark(userId, bookId, bookmarkId, now);
  revalidatePath(`/shelf/${bookId}`);
}

export async function deleteBookAction(bookId: string): Promise<void> {
  const { books, userId } = await context();
  await books.remove(userId, bookId);
  redirect('/shelf');
}
