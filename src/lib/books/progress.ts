import type { BookStatus } from './schema';

const FULL = 100;

export const readingPercent = (currentPage: number, totalPages: number): number => {
  if (totalPages <= 0) {
    return 0;
  }

  return Math.min(Math.floor((currentPage / totalPages) * FULL), FULL);
};

export const statusForProgress = (currentPage: number, totalPages: number, status: BookStatus): BookStatus => {
  if (currentPage >= totalPages) {
    return 'finished';
  }

  if (currentPage > 0 && status !== 'reading') {
    return 'reading';
  }

  return status;
};
