import { ObjectId } from 'mongodb';
import { startTestDatabase, type TestDatabase } from '@/test/mongo';
import { createBookRepository, type BookRepository } from './repository';
import { BOOK_NOT_FOUND, addBookmark, recordProgress, saveBook } from './service';

const NOW = new Date('2026-03-01T10:00:00.000Z');
const READER = new ObjectId().toHexString();

const FORM = {
  title: '  Vidas Secas ',
  author: 'Graciliano Ramos',
  totalPages: '176',
  currentPage: '0',
  status: 'want',
  rating: '',
  notes: '',
};

describe('book service', () => {
  let testDatabase: TestDatabase;
  let books: BookRepository;
  let context: { books: BookRepository; userId: string; now: Date };

  beforeAll(async () => {
    testDatabase = await startTestDatabase();
    books = createBookRepository(testDatabase.database);
    context = { books, userId: READER, now: NOW };
  });

  afterAll(async () => {
    await testDatabase.stop();
  });

  const createBook = async (overrides: Record<string, string> = {}): Promise<string> => {
    const { bookId } = await saveBook(context, { ...FORM, ...overrides });

    return bookId!;
  };

  it('saves form values as typed data', async () => {
    const bookId = await createBook({ rating: '5' });

    await expect(books.get(READER, bookId)).resolves.toMatchObject({
      title: 'Vidas Secas',
      totalPages: 176,
      currentPage: 0,
      rating: 5,
      status: 'want',
    });
  });

  it('moves the status with the page typed in the form', async () => {
    const bookId = await createBook({ currentPage: '176' });

    await expect(books.get(READER, bookId)).resolves.toMatchObject({ status: 'finished' });
  });

  it('reports each invalid field with its message key', async () => {
    await expect(
      saveBook(context, { ...FORM, title: ' ', totalPages: '0', status: 'lost', rating: '9', notes: 'x'.repeat(4001) }),
    ).resolves.toEqual({
      fieldErrors: {
        title: 'Enter a title up to 200 characters.',
        totalPages: 'Enter a page count from 1 to 20000.',
        status: 'Choose a reading status.',
        rating: 'Choose a rating from 1 to 5.',
        notes: 'Keep notes under 4000 characters.',
      },
    });
  });

  it('refuses a current page past the last page', async () => {
    await expect(saveBook(context, { ...FORM, currentPage: '177' })).resolves.toEqual({
      fieldErrors: { currentPage: 'Enter a page from 0 to the last page.' },
    });
  });

  it('updates an existing book', async () => {
    const bookId = await createBook();

    await expect(saveBook(context, { ...FORM, author: 'G. Ramos' }, bookId)).resolves.toEqual({ bookId });
    await expect(books.get(READER, bookId)).resolves.toMatchObject({ author: 'G. Ramos' });
  });

  it('does not update a book of another reader', async () => {
    const bookId = await createBook();
    const stranger = { ...context, userId: new ObjectId().toHexString() };

    await expect(saveBook(stranger, FORM, bookId)).resolves.toEqual({ error: BOOK_NOT_FOUND });
  });

  describe('recordProgress', () => {
    it('saves the page and starts the reading', async () => {
      const bookId = await createBook();

      await expect(recordProgress(context, bookId, { currentPage: '40' })).resolves.toEqual({ bookId, saved: true });
      await expect(books.get(READER, bookId)).resolves.toMatchObject({ currentPage: 40, status: 'reading' });
    });

    it.each([
      ['past the last page', '177'],
      ['negative', '-1'],
      ['not a number', 'forty'],
    ])('refuses a page that is %s', async (_description, currentPage) => {
      const bookId = await createBook();

      await expect(recordProgress(context, bookId, { currentPage })).resolves.toEqual({
        fieldErrors: { currentPage: 'Enter a page from 0 to the last page.' },
      });
    });

    it('refuses a missing book', async () => {
      await expect(recordProgress(context, new ObjectId().toHexString(), { currentPage: '1' })).resolves.toEqual({
        error: BOOK_NOT_FOUND,
      });
    });
  });

  describe('addBookmark', () => {
    it('adds a bookmark with a trimmed note', async () => {
      const bookId = await createBook();

      await expect(addBookmark(context, bookId, { page: '33', note: ' Fabiano ' })).resolves.toEqual({
        bookId,
        saved: true,
      });
      await expect(books.get(READER, bookId)).resolves.toMatchObject({
        bookmarks: [{ page: 33, note: 'Fabiano' }],
      });
    });

    it.each([
      ['0', 'Enter a page inside the book.'],
      ['177', 'Enter a page inside the book.'],
    ])('refuses the page %s', async (page, message) => {
      const bookId = await createBook();

      await expect(addBookmark(context, bookId, { page, note: '' })).resolves.toEqual({
        fieldErrors: { page: message },
      });
    });

    it('refuses a note that is too long', async () => {
      const bookId = await createBook();

      await expect(addBookmark(context, bookId, { page: '2', note: 'x'.repeat(501) })).resolves.toEqual({
        fieldErrors: { note: 'Keep the note under 500 characters.' },
      });
    });

    it('refuses a missing book', async () => {
      await expect(addBookmark(context, 'missing', { page: '1', note: '' })).resolves.toEqual({
        error: BOOK_NOT_FOUND,
      });
    });
  });
});
