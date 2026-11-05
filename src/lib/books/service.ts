import { fieldErrorsFrom, type FormState } from '@/lib/form';
import { statusForProgress } from './progress';
import type { BookRepository } from './repository';
import { bookInputSchema, bookmarkInputSchema, progressInputSchema } from './schema';

export const BOOK_NOT_FOUND = 'This book is not on your shelf.';
const PAGE_OUTSIDE_BOOK = 'Enter a page inside the book.';
const PAGE_PAST_END = 'Enter a page from 0 to the last page.';

export type BookActionResult = FormState & { bookId?: string };

type Context = { books: BookRepository; userId: string; now: Date };

export const saveBook = async (
  { books, userId, now }: Context,
  input: Record<string, unknown>,
  bookId?: string,
): Promise<BookActionResult> => {
  const parsed = bookInputSchema.safeParse(input);

  if (!parsed.success) {
    return { fieldErrors: fieldErrorsFrom(parsed.error) };
  }

  const book = {
    ...parsed.data,
    status: statusForProgress(parsed.data.currentPage, parsed.data.totalPages, parsed.data.status),
  };

  if (!bookId) {
    return { bookId: await books.create(userId, book, now) };
  }

  const updated = await books.update(userId, bookId, book, now);

  return updated ? { bookId: updated.id } : { error: BOOK_NOT_FOUND };
};

export const recordProgress = async (
  { books, userId, now }: Context,
  bookId: string,
  input: Record<string, unknown>,
): Promise<BookActionResult> => {
  const book = await books.get(userId, bookId);

  if (!book) {
    return { error: BOOK_NOT_FOUND };
  }

  const parsed = progressInputSchema.safeParse(input);

  if (!parsed.success) {
    return { fieldErrors: fieldErrorsFrom(parsed.error) };
  }

  const { currentPage } = parsed.data;

  if (currentPage > book.totalPages) {
    return { fieldErrors: { currentPage: PAGE_PAST_END } };
  }

  await books.updateProgress(
    userId,
    bookId,
    currentPage,
    statusForProgress(currentPage, book.totalPages, book.status),
    now,
  );

  return { bookId, saved: true };
};

export const addBookmark = async (
  { books, userId, now }: Context,
  bookId: string,
  input: Record<string, unknown>,
): Promise<BookActionResult> => {
  const book = await books.get(userId, bookId);

  if (!book) {
    return { error: BOOK_NOT_FOUND };
  }

  const parsed = bookmarkInputSchema.safeParse(input);

  if (!parsed.success) {
    return { fieldErrors: fieldErrorsFrom(parsed.error) };
  }

  if (parsed.data.page > book.totalPages) {
    return { fieldErrors: { page: PAGE_OUTSIDE_BOOK } };
  }

  await books.addBookmark(userId, bookId, parsed.data, now);

  return { bookId, saved: true };
};
