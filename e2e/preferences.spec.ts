import { expect, test } from './fixtures';

test('every page is in Brazilian Portuguese on paper, even on a dark English system', async ({ browser }) => {
  const context = await browser.newContext({ locale: 'en-US', colorScheme: 'dark' });
  const page = await context.newPage();
  await page.goto('/login');

  await expect(page.locator('html')).toHaveAttribute('lang', 'pt-BR');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Que bom te ver de novo');
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(247, 241, 227)');
  await context.close();
});

test('the browser time zone is remembered for the writing day', async ({ writerPage: page, context }) => {
  await page.goto('/write');

  await page.waitForFunction(() => document.cookie.includes('openwrimo-time-zone='));
  const zone = (await context.cookies()).find((cookie) => cookie.name === 'openwrimo-time-zone');

  expect(zone?.value).toBe(encodeURIComponent('America/Sao_Paulo'));
});
