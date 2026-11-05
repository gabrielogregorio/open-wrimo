import { addBook, axeViolations, expect, test } from './fixtures';

const THEMES = ['light', 'dark', 'night'] as const;

for (const theme of THEMES) {
  test.describe(`${theme} theme`, () => {
    test.beforeEach(async ({ context }) => {
      await context.addCookies([{ name: 'folio-theme', value: theme, url: 'http://127.0.0.1:8921' }]);
    });

    test('public pages have no WCAG A or AA violations', async ({ page }) => {
      await page.goto('/');
      expect(await axeViolations(page)).toEqual([]);
      await page.goto('/login');
      expect(await axeViolations(page)).toEqual([]);
      await page.goto('/register');
      await page.getByRole('button', { name: 'Create account' }).click();
      await page.getByLabel('Name').and(page.locator('[aria-invalid="true"]')).waitFor();
      expect(await axeViolations(page)).toEqual([]);
    });

    test('the shelf and a book page have no WCAG A or AA violations', async ({ readerPage: page }) => {
      expect(await axeViolations(page)).toEqual([]);
      await addBook(page, { title: 'Memórias Póstumas de Brás Cubas', author: 'Machado de Assis', totalPages: 368 });
      await page.getByLabel('Bookmark page').fill('7');
      await page.getByRole('button', { name: 'Add bookmark' }).click();
      await page.getByRole('button', { name: 'Remove bookmark on page 7' }).waitFor();
      expect(await axeViolations(page)).toEqual([]);
      await page.getByRole('link', { name: 'My shelf' }).click();
      await page.getByRole('region', { name: 'Books on the shelf' }).waitFor();
      expect(await axeViolations(page)).toEqual([]);
    });
  });
}
