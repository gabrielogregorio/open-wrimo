import AxeBuilder from '@axe-core/playwright';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { test as base, expect, type Page } from '@playwright/test';
import { MongoClient } from 'mongodb';
import sharp from 'sharp';

export const PASSWORD = 'a long enough secret';
const WCAG_AA_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];
const LOCAL_HOSTS = new Set(['127.0.0.1', 'localhost']);

export type Writer = { name: string; username: string; email: string };

export const uniqueWriter = (label: string): Writer => {
  const id = randomUUID().slice(0, 8);

  return {
    name: `${label} ${id}`,
    username: `${label}-${id}`.toLowerCase().slice(0, 20),
    email: `${label}-${id}@example.com`,
  };
};

export const signUp = async (page: Page, writer: Writer): Promise<void> => {
  await page.goto('/register');
  await page.getByLabel('Nome', { exact: true }).fill(writer.name);
  await page.getByLabel('Nome de usuário').fill(writer.username);
  await page.getByLabel('E-mail').fill(writer.email);
  await page.getByLabel('Senha', { exact: true }).fill(PASSWORD);
  await page.getByRole('checkbox', { name: /Li e aceito os/ }).check();
  await page.getByRole('button', { name: 'Criar conta' }).click();
  await expect(page).toHaveURL('/write');
};

export const signIn = async (page: Page, email: string, password = PASSWORD): Promise<void> => {
  await page.getByLabel('E-mail').fill(email);
  await page.getByLabel('Senha', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Entrar' }).click();
};

/**
 * Changes one account straight in the E2E database, for states with no screen of their own: an admin,
 * terms accepted long ago or a deletion asked for weeks ago. scripts/serve-e2e.mts says where it is.
 */
export const updateAccount = async (username: string, fields: Record<string, unknown>): Promise<void> => {
  const { uri, databaseName } = JSON.parse(readFileSync('node_modules/.cache/openwrimo-e2e-database.json', 'utf8')) as {
    uri: string;
    databaseName: string;
  };
  const client = await new MongoClient(uri).connect();

  try {
    await client.db(databaseName).collection('users').updateOne({ username }, { $set: fields });
  } finally {
    await client.close();
  }
};

export const pngImage = async (width = 600, height = 900, color = '#1f3a5f'): Promise<Buffer> =>
  sharp({ create: { width, height, channels: 3, background: color } })
    .png()
    .toBuffer();

export type NewNovel = { title: string; cover?: Buffer; daily?: number; event?: string; isPublic?: boolean };

export const createNovel = async (page: Page, novel: NewNovel): Promise<string> => {
  await page.goto('/write/novels/new');
  await page.locator('#field-title').fill(novel.title);

  if (novel.cover) {
    await page.locator('#field-cover').setInputFiles({ name: 'cover.png', mimeType: 'image/png', buffer: novel.cover });
  }

  if (novel.isPublic) {
    await page.getByLabel('Quanta privacidade você deseja?').selectOption('on');
  }

  if (novel.daily) {
    await page.getByLabel('Com que frequência').selectOption('daily');
    await page.locator('#field-periodTarget').fill(String(novel.daily));
  }

  if (novel.event) {
    await page.getByLabel('Participar de um evento').selectOption(novel.event);
  }

  await page.getByRole('button', { name: 'Criar romance' }).click();
  await expect(page).toHaveURL(/\/write\/novels\/[0-9a-f]{24}$/);

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

export const test = base.extend<{ writerPage: Page; writer: Writer }>({
  context: async ({ context }, use) => {
    await context.route('**/*', async (route) => {
      const url = new URL(route.request().url());

      if (LOCAL_HOSTS.has(url.hostname) || url.protocol === 'data:' || url.protocol === 'blob:') {
        await route.continue();

        return;
      }

      await route.abort('blockedbyclient');
    });
    await context.addInitScript(() => {
      window.localStorage.setItem('openwrimo-sound', 'off');
    });
    await use(context);
  },
  writer: async ({}, use, testInfo) => {
    await use(uniqueWriter(`w${testInfo.workerIndex}`));
  },
  writerPage: async ({ page, writer }, use) => {
    await signUp(page, writer);
    await use(page);
  },
});

export { expect };
