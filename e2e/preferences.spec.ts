import { expect, test } from './fixtures';

test('?lang=pt-BR translates the page and is remembered', async ({ page }) => {
  await page.goto('/login?lang=pt-BR');

  await expect(page.locator('html')).toHaveAttribute('lang', 'pt-BR');
  await expect(page.getByRole('heading', { name: 'Que bom te ver de novo' })).toBeVisible();

  await page.goto('/register');
  await expect(page.getByRole('button', { name: 'Criar conta' })).toBeVisible();
});

test('the browser language is used when nothing was chosen', async ({ browser }) => {
  const context = await browser.newContext({ locale: 'pt-BR' });
  const page = await context.newPage();
  await page.goto('/');

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Um lugar sereno para os livros que você lê.');
  await context.close();
});

test('the language switcher changes the text and survives a reload', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Language').selectOption('pt-BR');

  await expect(page.getByRole('heading', { name: 'Que bom te ver de novo' })).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('lang', 'pt-BR');

  await page.reload();
  await expect(page.getByLabel('Idioma')).toHaveValue('pt-BR');
});

test('every page uses the paper theme, even on a dark system', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/login');

  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(247, 241, 227)');
  await expect(page.getByLabel('Theme')).toHaveCount(0);
});
