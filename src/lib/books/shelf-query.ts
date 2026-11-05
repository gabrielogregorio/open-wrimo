import { BOOK_STATUSES, type BookStatus } from './schema';

const MAX_PAGE = 1000;

export type ShelfQuery = { status?: BookStatus; page: number };

const first = (value: string | string[] | undefined): string | undefined => (Array.isArray(value) ? value[0] : value);

export const parseShelfQuery = (params: Record<string, string | string[] | undefined>): ShelfQuery => {
  const status = first(params.status);
  const page = Number.parseInt(first(params.page) ?? '1', 10);

  return {
    status: BOOK_STATUSES.includes(status as BookStatus) ? (status as BookStatus) : undefined,
    page: Number.isInteger(page) && page >= 1 && page <= MAX_PAGE ? page : 1,
  };
};

export const shelfHref = ({ status, page }: ShelfQuery): string => {
  const search = new URLSearchParams();

  if (status) {
    search.set('status', status);
  }

  if (page > 1) {
    search.set('page', String(page));
  }

  const query = search.toString();

  return query ? `/shelf?${query}` : '/shelf';
};
