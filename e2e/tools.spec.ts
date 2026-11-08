import { axeViolations, createNovel, expect, test } from './fixtures';

test('tools can be starred, and the focus editor keeps its text on the device', async ({ writerPage: page }) => {
  await createNovel(page, { title: 'O Farol', daily: 500 });
  await page.goto('/write/tools');
  await page.waitForLoadState('networkidle');
  await page.getByRole('button', { name: 'Favoritar Editor de foco' }).click();
  const favorites = page.locator('section', { has: page.getByRole('heading', { name: 'Favoritas' }) });
  await expect(favorites.getByRole('link', { name: /Editor de foco/ })).toBeVisible();
  expect(await axeViolations(page)).toEqual([]);

  await favorites.getByRole('link', { name: /Editor de foco/ }).click();
  await page.waitForURL('**/write/tools/focus');
  await page.waitForLoadState('networkidle');
  await page.locator('textarea').first().fill('A luz do farol girava sobre o mar escuro.');
  await expect(page.getByText('9 palavras').first()).toBeVisible();
  await expect(page.getByText(/· Salvo neste aparelho$/)).toBeVisible();
  await page.reload();
  await page.waitForLoadState('networkidle');
  await expect(page.locator('textarea').first()).toHaveValue('A luz do farol girava sobre o mar escuro.');

  await page.goto('/write/tools');
  await page.waitForLoadState('networkidle');
  await expect(
    page.locator('section', { has: page.getByRole('heading', { name: 'Favoritas' }) }).getByRole('link'),
  ).toHaveCount(1);
});

test('every tool page opens without errors on a phone', async ({ writerPage: page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/write/tools');
  const links = await page
    .locator('a[href^="/write/tools/"]')
    .evaluateAll((anchors) => anchors.map((anchor) => anchor.getAttribute('href') ?? ''));

  expect(links.length).toBeGreaterThanOrEqual(22);

  for (const href of new Set(links)) {
    await page.goto(href);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth), href).toBeLessThanOrEqual(390);
  }

  expect(errors).toEqual([]);
});
