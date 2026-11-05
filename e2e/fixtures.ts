import AxeBuilder from '@axe-core/playwright';
import { randomUUID } from 'node:crypto';
import { test as base, expect, type Page } from '@playwright/test';

export const PASSWORD = 'a long enough secret';
const WCAG_AA_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];
const LOCAL_HOSTS = new Set(['127.0.0.1', 'localhost']);

export type Reader = { name: string; email: string };

export const uniqueEmail = (label: string): string => `${label}-${randomUUID()}@example.com`;

export const signUp = async (page: Page, reader: Reader): Promise<void> => {
  await page.goto('/register');
  await page.getByLabel('Name').fill(reader.name);
  await page.getByLabel('Email').fill(reader.email);
  await page.getByLabel('Password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page).toHaveURL('/write');
};

export type NewBook = { title: string; author: string; totalPages: number };

export const addBook = async (page: Page, book: NewBook): Promise<string> => {
  await page.goto('/shelf/new');
  await page.getByLabel('Title').fill(book.title);
  await page.getByLabel('Author').fill(book.author);
  await page.getByLabel('Total pages').fill(String(book.totalPages));
  await page.getByRole('button', { name: 'Add to shelf' }).click();
  await expect(page).toHaveURL(/\/shelf\/[0-9a-f]{24}$/);

  return page.url();
};

const waitForFiniteAnimations = async (page: Page): Promise<void> => {
  await page.evaluate(async () => {
    const finiteAnimations = document
      .getAnimations()
      .filter((animation) => animation.effect?.getTiming().iterations !== Infinity);

    await Promise.all(finiteAnimations.map((animation) => animation.finished.catch(() => undefined)));
  });
};

export const axeViolations = async (page: Page) => {
  await page.getByRole('main').waitFor();
  await page.waitForFunction(() => document.title.length > 0);
  await waitForFiniteAnimations(page);

  return (await new AxeBuilder({ page }).withTags(WCAG_AA_TAGS).analyze()).violations;
};

export const test = base.extend<{ readerPage: Page; writerPage: Page }>({
  context: async ({ context }, use) => {
    await context.route('**/*', async (route) => {
      const url = new URL(route.request().url());

      if (LOCAL_HOSTS.has(url.hostname) || url.protocol === 'data:' || url.protocol === 'blob:') {
        await route.continue();

        return;
      }

      await route.abort('blockedbyclient');
    });
    await use(context);
  },
  readerPage: async ({ page }, use, testInfo) => {
    await signUp(page, { name: 'Lia', email: uniqueEmail(`reader-${testInfo.workerIndex}`) });
    await page.goto('/shelf');
    await use(page);
  },
  writerPage: async ({ page }, use, testInfo) => {
    await signUp(page, { name: 'Clara', email: uniqueEmail(`writer-${testInfo.workerIndex}`) });
    await use(page);
  },
});

export { expect };
