import { axeViolations, createNovel, expect, test } from './fixtures';

test('public pages have no WCAG A or AA violations', async ({ page }) => {
  for (const path of ['/', '/login', '/register']) {
    await page.goto(path);
    expect(await axeViolations(page)).toEqual([]);
  }

  await page.getByRole('button', { name: 'Criar conta' }).click();
  await page.getByLabel('Nome', { exact: true }).and(page.locator('[aria-invalid="true"]')).waitFor();
  expect(await axeViolations(page)).toEqual([]);
});

test('the writing pages have no WCAG A or AA violations', async ({ writerPage: page }) => {
  expect(await axeViolations(page)).toEqual([]);
  const url = await createNovel(page, { title: 'Acessível', daily: 500 });

  for (const path of [
    url,
    `${url}?tab=goals`,
    `${url}?tab=badges`,
    `${url}/edit`,
    '/write/novels/new',
    '/write/update',
    '/write/stats',
    '/write/sprint',
    '/write/profile',
    '/write/profile/edit',
    '/write/community',
  ]) {
    await page.goto(path);
    expect(await axeViolations(page), path).toEqual([]);
  }
});
