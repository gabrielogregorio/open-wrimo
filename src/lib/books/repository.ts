import { ObjectId, type Db, type Filter } from 'mongodb';
import { collections, type BookDocument, type StoredBook } from '@/lib/db/collections';
import type { BookInput, BookmarkInput, BookStatus } from './schema';

export const SHELF_PAGE_SIZE = 48;

export type BookmarkView = { id: string; page: number; note: string; createdAt: string };

export type BookView = {
  id: string;
  title: string;
  author: string;
  totalPages: number;
  currentPage: number;
  status: BookStatus;
  rating: number | null;
  notes: string;
  bookmarks: BookmarkView[];
  updatedAt: string;
};

export type ShelfPage = { books: BookView[]; hasNextPage: boolean; counts: Record<BookStatus | 'all', number> };

export const toBookView = (book: StoredBook): BookView => ({
  id: book._id.toHexString(),
  title: book.title,
  author: book.author,
  totalPages: book.totalPages,
  currentPage: book.currentPage,
  status: book.status,
  rating: book.rating,
  notes: book.notes,
  bookmarks: [...book.bookmarks]
    .sort((first, second) => first.page - second.page)
    .map((bookmark) => ({
      id: bookmark.id.toHexString(),
      page: bookmark.page,
      note: bookmark.note,
      createdAt: bookmark.createdAt.toISOString(),
    })),
  updatedAt: book.updatedAt.toISOString(),
});

const objectIdOrNull = (value: string): ObjectId | null => (ObjectId.isValid(value) ? new ObjectId(value) : null);

export type BookRepository = ReturnType<typeof createBookRepository>;

export const createBookRepository = (database: Db) => {
  const { books } = collections(database);

  const ownedBy = (userId: string, bookId: string): Filter<BookDocument> | null => {
    const bookObjectId = objectIdOrNull(bookId);

    return bookObjectId ? { _id: bookObjectId, userId: new ObjectId(userId) } : null;
  };

  const updateOwned = async (
    userId: string,
    bookId: string,
    update: Parameters<typeof books.findOneAndUpdate>[1],
  ): Promise<BookView | null> => {
    const filter = ownedBy(userId, bookId);

    if (!filter) {
      return null;
    }

    const book = await books.findOneAndUpdate(filter, update, { returnDocument: 'after' });

    return book ? toBookView(book) : null;
  };

  return {
    async list(userId: string, options: { status?: BookStatus; page: number }): Promise<ShelfPage> {
      const owner = new ObjectId(userId);
      const filter: Filter<BookDocument> = options.status
        ? { userId: owner, status: options.status }
        : { userId: owner };
      const found = await books
        .find(filter)
        .sort({ updatedAt: -1, _id: -1 })
        .skip((options.page - 1) * SHELF_PAGE_SIZE)
        .limit(SHELF_PAGE_SIZE + 1)
        .toArray();
      const grouped = await books
        .aggregate<{ _id: BookStatus; total: number }>([
          { $match: { userId: owner } },
          { $group: { _id: '$status', total: { $sum: 1 } } },
        ])
        .toArray();
      const counts = { all: 0, want: 0, reading: 0, finished: 0 };

      for (const group of grouped) {
        counts[group._id] = group.total;
        counts.all += group.total;
      }

      return {
        books: found.slice(0, SHELF_PAGE_SIZE).map(toBookView),
        hasNextPage: found.length > SHELF_PAGE_SIZE,
        counts,
      };
    },

    async get(userId: string, bookId: string): Promise<BookView | null> {
      const filter = ownedBy(userId, bookId);

      if (!filter) {
        return null;
      }

      const book = await books.findOne(filter);

      return book ? toBookView(book) : null;
    },

    async create(userId: string, input: BookInput, now: Date): Promise<string> {
      const { insertedId } = await books.insertOne({
        ...input,
        userId: new ObjectId(userId),
        bookmarks: [],
        createdAt: now,
        updatedAt: now,
      });

      return insertedId.toHexString();
    },

    update: (userId: string, bookId: string, input: BookInput, now: Date) =>
      updateOwned(userId, bookId, { $set: { ...input, updatedAt: now } }),

    updateProgress: (userId: string, bookId: string, currentPage: number, status: BookStatus, now: Date) =>
      updateOwned(userId, bookId, { $set: { currentPage, status, updatedAt: now } }),

    addBookmark: (userId: string, bookId: string, bookmark: BookmarkInput, now: Date) =>
      updateOwned(userId, bookId, {
        $push: { bookmarks: { id: new ObjectId(), page: bookmark.page, note: bookmark.note, createdAt: now } },
        $set: { updatedAt: now },
      }),

    removeBookmark: (userId: string, bookId: string, bookmarkId: string, now: Date) => {
      const bookmarkObjectId = objectIdOrNull(bookmarkId);

      if (!bookmarkObjectId) {
        return Promise.resolve(null);
      }

      return updateOwned(userId, bookId, {
        $pull: { bookmarks: { id: bookmarkObjectId } },
        $set: { updatedAt: now },
      });
    },

    async remove(userId: string, bookId: string): Promise<boolean> {
      const filter = ownedBy(userId, bookId);

      if (!filter) {
        return false;
      }

      const { deletedCount } = await books.deleteOne(filter);

      return deletedCount === 1;
    },
  };
};
