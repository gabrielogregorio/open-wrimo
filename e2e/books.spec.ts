import { addBook, expect, signUp, test, uniqueEmail } from './fixtures';

const BOOK = { title: 'Grande Sertão: Veredas', author: 'João Guimarães Rosa', totalPages: 600 };

test('a reader adds a book, tracks the page and finishes it', async ({ readerPage: page }) => {
  await expect(page.getByText('This shelf is still empty.')).toBeVisible();

  await addBook(page, BOOK);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(BOOK.title);
  await expect(page.getByText('Want to read')).toBeVisible();

  await page.getByLabel('I am on page').fill('150');
  await page.getByRole('button', { name: 'Update' }).click();
  await expect(page.getByRole('status')).toHaveText('Progress saved.');
  await expect(page.getByRole('progressbar', { name: 'Reading progress' })).toHaveAttribute('aria-valuenow', '25');
  await expect(page.getByText('Reading', { exact: true })).toBeVisible();

  await page.getByLabel('I am on page').fill('601');
  await page.getByRole('button', { name: 'Update' }).click();
  await expect(page.getByLabel('I am on page')).toHaveAccessibleDescription('Enter a page from 0 to the last page.');

  await page.getByLabel('I am on page').fill('600');
  await page.getByRole('button', { name: 'Update' }).click();
  await expect(page.getByText('Finished', { exact: true })).toBeVisible();
});

test('a reader bookmarks a passage and removes it', async ({ readerPage: page }) => {
  await addBook(page, BOOK);

  await page.getByLabel('Bookmark page').fill('42');
  await page.getByLabel('Note', { exact: true }).fill('Nonada.');
  await page.getByRole('button', { name: 'Add bookmark' }).click();
  await expect(page.getByText('Nonada.')).toBeVisible();

  await page.getByRole('button', { name: 'Remove bookmark on page 42' }).click();
  await expect(page.getByText('No bookmarks yet. Mark a page you want to come back to.')).toBeVisible();
});

test('a reader edits the details and removes the book', async ({ readerPage: page }) => {
  await addBook(page, BOOK);

  await page.getByRole('link', { name: 'Edit details' }).click();
  await page.getByLabel('Rating').selectOption('5');
  await page.getByLabel('Notes').fill('Read it slowly.');
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.getByText('5 of 5 stars')).toBeVisible();
  await expect(page.getByText('Read it slowly.')).toBeVisible();

  await page.getByRole('button', { name: 'Remove from shelf' }).click();
  await page.getByRole('button', { name: 'Yes, remove it' }).click();
  await expect(page).toHaveURL('/shelf');
  await expect(page.getByText('This shelf is still empty.')).toBeVisible();
});

test('the shelf filters by status', async ({ readerPage: page }) => {
  await addBook(page, { title: 'Iracema', author: 'José de Alencar', totalPages: 150 });
  await page.getByLabel('I am on page').fill('20');
  await page.getByRole('button', { name: 'Update' }).click();
  await expect(page.getByRole('status')).toHaveText('Progress saved.');
  await addBook(page, { title: 'Senhora', author: 'José de Alencar', totalPages: 200 });

  await page.goto('/shelf');
  await expect(page.getByRole('link', { name: 'All books (2)' })).toHaveAttribute('aria-current', 'page');
  await page.getByRole('link', { name: 'Reading (1)' }).click();

  const shelf = page.getByRole('region', { name: 'Books on the shelf' });
  await expect(shelf.getByRole('link')).toHaveCount(1);
  await expect(shelf.getByRole('link', { name: 'Iracema José de Alencar' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Reading now' })).toBeVisible();
});

test('the form refuses a book without the required fields', async ({ readerPage: page }) => {
  await page.goto('/shelf/new');
  await page.getByRole('button', { name: 'Add to shelf' }).click();

  await expect(page.getByLabel('Title')).toHaveAccessibleDescription('Enter a title up to 200 characters.');
  await expect(page.getByLabel('Total pages')).toHaveAccessibleDescription('Enter a page count from 1 to 20000.');
});

test("one reader cannot open another reader's book", async ({ readerPage: page, browser }) => {
  const bookUrl = await addBook(page, BOOK);

  const strangerContext = await browser.newContext({ locale: 'en-US' });
  const strangerPage = await strangerContext.newPage();
  await signUp(strangerPage, { name: 'Outsider', email: uniqueEmail('outsider') });
  await strangerPage.goto(bookUrl);

  await expect(strangerPage.getByRole('heading', { name: 'This page is missing from the book.' })).toBeVisible();
  await strangerContext.close();
});

test('cancelling a new book crumples the sheet and goes back to the shelf', async ({ readerPage: page }) => {
  await page.getByRole('link', { name: 'Add a book' }).first().click();
  await page.getByLabel('Title').fill('Rascunho');
  await page.getByRole('link', { name: 'Cancel' }).click();

  await expect(page.getByTestId('book-sheet')).toHaveClass(/crumple/);
  await expect(page).toHaveURL('/shelf');
  await expect(page.getByText('This shelf is still empty.')).toBeVisible();
});
