import { ObjectId } from 'mongodb';
import { startTestDatabase, type TestDatabase } from '@/test/mongo';
import { SHELF_PAGE_SIZE, createBookRepository, type BookRepository } from './repository';
import type { BookInput } from './schema';

const NOW = new Date('2026-03-01T10:00:00.000Z');
const READER = new ObjectId().toHexString();
const OTHER_READER = new ObjectId().toHexString();

const BOOK: BookInput = {
  title: 'O Cortiço',
  author: 'Aluísio Azevedo',
  totalPages: 280,
  currentPage: 0,
  status: 'want',
  rating: null,
  notes: '',
};

const minutesLater = (minutes: number): Date => new Date(NOW.getTime() + minutes * 60_000);

describe('createBookRepository', () => {
  let testDatabase: TestDatabase;
  let books: BookRepository;

  beforeAll(async () => {
    testDatabase = await startTestDatabase();
    books = createBookRepository(testDatabase.database);
  });

  afterAll(async () => {
    await testDatabase.stop();
  });

  it('creates a book and returns it as a plain view', async () => {
    const bookId = await books.create(READER, BOOK, NOW);

    await expect(books.get(READER, bookId)).resolves.toEqual({
      ...BOOK,
      id: bookId,
      bookmarks: [],
      updatedAt: NOW.toISOString(),
    });
  });

  it('hides a book from another reader', async () => {
    const bookId = await books.create(READER, BOOK, NOW);

    await expect(books.get(OTHER_READER, bookId)).resolves.toBeNull();
    await expect(books.update(OTHER_READER, bookId, { ...BOOK, title: 'Taken' }, NOW)).resolves.toBeNull();
    await expect(books.remove(OTHER_READER, bookId)).resolves.toBe(false);
    await expect(books.get(READER, bookId)).resolves.toMatchObject({ title: 'O Cortiço' });
  });

  it.each(['not-an-id', ''])('treats the id "%s" as missing', async (bookId) => {
    await expect(books.get(READER, bookId)).resolves.toBeNull();
    await expect(books.update(READER, bookId, BOOK, NOW)).resolves.toBeNull();
    await expect(books.remove(READER, bookId)).resolves.toBe(false);
  });

  it('updates details and progress', async () => {
    const bookId = await books.create(READER, BOOK, NOW);
    await books.update(READER, bookId, { ...BOOK, rating: 4, notes: 'Dense.' }, minutesLater(1));
    const updated = await books.updateProgress(READER, bookId, 120, 'reading', minutesLater(2));

    expect(updated).toMatchObject({
      rating: 4,
      notes: 'Dense.',
      currentPage: 120,
      status: 'reading',
      updatedAt: minutesLater(2).toISOString(),
    });
  });

  it('keeps bookmarks sorted by page and removes one by id', async () => {
    const bookId = await books.create(READER, BOOK, NOW);
    await books.addBookmark(READER, bookId, { page: 90, note: 'The fight' }, NOW);
    const withBoth = await books.addBookmark(READER, bookId, { page: 12, note: '' }, NOW);

    expect(withBoth?.bookmarks.map((bookmark) => bookmark.page)).toEqual([12, 90]);

    const afterRemoval = await books.removeBookmark(READER, bookId, withBoth!.bookmarks[0].id, NOW);

    expect(afterRemoval?.bookmarks).toEqual([
      { id: expect.any(String), page: 90, note: 'The fight', createdAt: NOW.toISOString() },
    ]);
  });

  it('ignores a bookmark id that is not valid', async () => {
    const bookId = await books.create(READER, BOOK, NOW);

    await expect(books.removeBookmark(READER, bookId, 'nope', NOW)).resolves.toBeNull();
  });

  it('deletes a book', async () => {
    const bookId = await books.create(READER, BOOK, NOW);

    await expect(books.remove(READER, bookId)).resolves.toBe(true);
    await expect(books.get(READER, bookId)).resolves.toBeNull();
  });

  describe('list', () => {
    const shelfOwner = new ObjectId().toHexString();

    beforeAll(async () => {
      const statuses = ['want', 'reading', 'reading', 'finished'] as const;

      await Promise.all(
        statuses.map((status, index) =>
          books.create(shelfOwner, { ...BOOK, title: `Book ${index}`, status }, minutesLater(index)),
        ),
      );
    });

    it('lists the newest first with counts per status', async () => {
      const shelf = await books.list(shelfOwner, { page: 1 });

      expect(shelf.books.map((book) => book.title)).toEqual(['Book 3', 'Book 2', 'Book 1', 'Book 0']);
      expect(shelf.counts).toEqual({ all: 4, want: 1, reading: 2, finished: 1 });
      expect(shelf.hasNextPage).toBe(false);
    });

    it('filters by status', async () => {
      const shelf = await books.list(shelfOwner, { status: 'reading', page: 1 });

      expect(shelf.books.map((book) => book.title)).toEqual(['Book 2', 'Book 1']);
    });

    it('pages a long shelf', async () => {
      const longShelfOwner = new ObjectId().toHexString();
      const total = SHELF_PAGE_SIZE + 1;

      await Promise.all(
        Array.from({ length: total }, (_unused, index) =>
          books.create(longShelfOwner, { ...BOOK, title: `Volume ${index}` }, minutesLater(index)),
        ),
      );

      const firstPage = await books.list(longShelfOwner, { page: 1 });
      const secondPage = await books.list(longShelfOwner, { page: 2 });

      expect(firstPage.books).toHaveLength(SHELF_PAGE_SIZE);
      expect(firstPage.hasNextPage).toBe(true);
      expect(secondPage.books.map((book) => book.title)).toEqual(['Volume 0']);
      expect(secondPage.hasNextPage).toBe(false);
    });
  });
});
