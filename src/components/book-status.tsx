import type { BookStatus } from '@/lib/books/schema';

export const STATUS_LABELS: Record<BookStatus, string> = {
  want: 'Want to read',
  reading: 'Reading',
  finished: 'Finished',
};
