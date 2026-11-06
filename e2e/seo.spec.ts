import { expect, test } from './fixtures';

test('the icons, manifest, robots and share images are served', async ({ request }) => {
  for (const [path, type] of [
    ['/favicon.ico', 'image/x-icon'],
    ['/icon.svg', 'image/svg+xml'],
    ['/apple-icon.png', 'image/png'],
    ['/icons/icon-512.png', 'image/png'],
    ['/opengraph-image', 'image/png'],
    ['/twitter-image', 'image/png'],
  ]) {
    const response = await request.get(path);
    expect(response.status(), path).toBe(200);
    expect(response.headers()['content-type'], path).toContain(type);
  }

  const manifest = await (await request.get('/manifest.webmanifest')).json();
  expect(manifest).toMatchObject({ name: 'Open Wrimo', lang: 'pt-BR', start_url: '/write' });
  expect(manifest.icons).toHaveLength(3);

  const robots = await (await request.get('/robots.txt')).text();
  expect(robots).toContain('Disallow: /write');
  expect(robots).toContain('Allow: /u/');
  expect(robots).toContain('Sitemap: http://127.0.0.1:8921/sitemap.xml');
});

test('the home page carries the title, description, canonical, share tags and structured data', async ({ page }) => {
  await page.goto('/');

  await expect(page).toHaveTitle('Open Wrimo');
  await expect(page.locator('meta[name="description"]').first()).toHaveAttribute('content', /romance/);
  expect(
    new Set(
      await page
        .locator('meta[name="description"]')
        .evaluateAll((tags) => tags.map((tag) => tag.getAttribute('content'))),
    ).size,
  ).toBe(1);
  await expect(page.locator('link[rel="canonical"]').first()).toHaveAttribute('href', 'http://127.0.0.1:8921');
  await expect(page.locator('meta[property="og:image"]').first()).toHaveAttribute('content', /opengraph-image/);
  await expect(page.locator('meta[name="twitter:card"]').first()).toHaveAttribute('content', 'summary_large_image');
  await expect(page.locator('link[rel="manifest"]').first()).toHaveAttribute('href', '/manifest.webmanifest');
  const data = JSON.parse((await page.locator('script[type="application/ld+json"]').textContent())!);
  expect(data).toMatchObject({ '@type': 'WebApplication', name: 'Open Wrimo', inLanguage: 'pt-BR' });
});

test('public profiles are in the sitemap and indexable, private pages are not', async ({
  writerPage: page,
  writer,
  request,
}) => {
  await expect(page.locator('meta[name="robots"]').first()).toHaveAttribute('content', 'noindex, nofollow');
  expect(await (await request.get('/sitemap.xml')).text()).not.toContain(`/u/${writer.username}`);

  await page.goto('/write/profile/edit');
  await page.getByRole('textbox', { name: 'Sobre mim' }).fill('Romances curtos sobre o mar.');
  await page.getByLabel('Qualquer pessoa com o link pode ver meu perfil').check();
  await page.getByRole('button', { name: 'Salvar alterações' }).click();
  await expect(page).toHaveURL('/write/profile');

  expect(await (await request.get('/sitemap.xml')).text()).toContain(`/u/${writer.username}`);
  await page.goto(`/u/${writer.username}`);
  await expect(page.locator('meta[name="robots"]')).toHaveCount(0);
  await expect(page.locator('meta[property="og:type"]').first()).toHaveAttribute('content', 'profile');
  await expect(page.locator('meta[name="description"]').first()).toHaveAttribute(
    'content',
    'Romances curtos sobre o mar.',
  );
  const data = JSON.parse((await page.locator('script[type="application/ld+json"]').textContent())!);
  expect(data).toMatchObject({ '@type': 'ProfilePage', mainEntity: { '@type': 'Person', name: writer.name } });
  const image = await request.get(`/u/${writer.username}/opengraph-image`);
  expect(image.headers()['content-type']).toContain('image/png');
});
