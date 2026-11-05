import { expect, test } from './fixtures';

const BLUE_CHANNEL = /^rgba?\(\d+, \d+, (\d+)/;

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

test('night mode removes the blue from the page and survives a reload', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Theme').selectOption('night');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'night');

  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'night');

  const colors = await page.evaluate(() =>
    [...document.querySelectorAll('body, body *')].flatMap((element) => {
      const style = getComputedStyle(element);

      return [style.color, style.backgroundColor].filter((color) => color !== 'rgba(0, 0, 0, 0)');
    }),
  );
  const blueChannels = new Set(colors.map((color) => BLUE_CHANNEL.exec(color)?.[1]));

  expect([...blueChannels]).toEqual(['0']);
});

test('the dark theme follows the choice even on a light system', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/login');
  await page.getByLabel('Theme').selectOption('dark');

  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(26, 23, 20)');
});
