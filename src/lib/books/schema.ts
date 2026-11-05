import { z } from 'zod';

export const BOOK_STATUSES = ['want', 'reading', 'finished'] as const;
export type BookStatus = (typeof BOOK_STATUSES)[number];

export const MAX_PAGES = 20000;
export const MAX_RATING = 5;
const TITLE_MAX_LENGTH = 200;
const AUTHOR_MAX_LENGTH = 120;
const NOTES_MAX_LENGTH = 4000;
const BOOKMARK_NOTE_MAX_LENGTH = 500;

const pageNumber = (minimum: number, message: string) =>
  z.coerce.number({ error: message }).int({ error: message }).min(minimum, { error: message }).max(MAX_PAGES, {
    error: message,
  });

const optionalRating = z.preprocess(
  (value) => (value === '' || value === undefined || value === null ? null : value),
  z.coerce
    .number({ error: 'Choose a rating from 1 to 5.' })
    .int({ error: 'Choose a rating from 1 to 5.' })
    .min(1, { error: 'Choose a rating from 1 to 5.' })
    .max(MAX_RATING, { error: 'Choose a rating from 1 to 5.' })
    .nullable(),
);

export const bookInputSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, { error: 'Enter a title up to 200 characters.' })
      .max(TITLE_MAX_LENGTH, { error: 'Enter a title up to 200 characters.' }),
    author: z
      .string()
      .trim()
      .min(1, { error: 'Enter an author up to 120 characters.' })
      .max(AUTHOR_MAX_LENGTH, { error: 'Enter an author up to 120 characters.' }),
    totalPages: pageNumber(1, 'Enter a page count from 1 to 20000.'),
    currentPage: pageNumber(0, 'Enter a page from 0 to the last page.'),
    status: z.enum(BOOK_STATUSES, { error: 'Choose a reading status.' }),
    rating: optionalRating,
    notes: z.string().trim().max(NOTES_MAX_LENGTH, { error: 'Keep notes under 4000 characters.' }),
  })
  .refine((book) => book.currentPage <= book.totalPages, {
    path: ['currentPage'],
    error: 'Enter a page from 0 to the last page.',
  });

export const progressInputSchema = z.object({
  currentPage: pageNumber(0, 'Enter a page from 0 to the last page.'),
});

export const bookmarkInputSchema = z.object({
  page: pageNumber(1, 'Enter a page inside the book.'),
  note: z.string().trim().max(BOOKMARK_NOTE_MAX_LENGTH, { error: 'Keep the note under 500 characters.' }),
});

export type BookInput = z.infer<typeof bookInputSchema>;
export type BookmarkInput = z.infer<typeof bookmarkInputSchema>;

export const BOOK_FIELDS = ['title', 'author', 'totalPages', 'currentPage', 'status', 'rating', 'notes'] as const;
