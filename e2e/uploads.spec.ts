import { createNovel, expect, pngImage, test } from './fixtures';

const FIVE_MB = 5 * 1024 * 1024;

test('a cover of 5 MB or more is stopped in the browser', async ({ writerPage: page }) => {
  await page.goto('/write/novels/new');
  await page.waitForLoadState('networkidle');
  await page.locator('#field-cover').setInputFiles({
    name: 'huge.png',
    mimeType: 'image/png',
    buffer: Buffer.alloc(FIVE_MB, 1),
  });

  await expect(page.getByText('Envie uma imagem com menos de 5 MB.')).toBeVisible();
  await expect(page.locator('#field-cover')).toHaveValue('');
});

test('the chosen cover is still sent after the form comes back with an error', async ({ writerPage: page }) => {
  await page.goto('/write/novels/new');
  await page.waitForLoadState('networkidle');
  await page
    .locator('#field-cover')
    .setInputFiles({ name: 'cover.png', mimeType: 'image/png', buffer: await pngImage() });
  await page.locator('.ProseMirror').click();
  await page.keyboard.type('Trecho escrito antes do erro.');
  await page.getByRole('button', { name: 'Criar romance' }).click();
  await expect(page.locator('#field-title')).toHaveAttribute('aria-invalid', 'true');
  await expect(page.locator('.ProseMirror')).toContainText('Trecho escrito antes do erro.');

  await page.locator('#field-title').fill('Com capa depois do erro');
  await page.getByRole('button', { name: 'Criar romance' }).click();
  await expect(page).toHaveURL(/\/write\/novels\/[0-9a-f]{24}$/);
  await expect(page.locator('.book-mock img')).toHaveAttribute('src', /^\/media\/covers\//);
});

test('a file that only pretends to be an image is refused by the server', async ({ writerPage: page }) => {
  const url = await createNovel(page, { title: 'Capa falsa' });
  await page.goto(`${url}/edit`);
  await page.locator('#field-cover').setInputFiles({
    name: 'cover.png',
    mimeType: 'image/png',
    buffer: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"/>'),
  });
  await page.getByRole('button', { name: 'Salvar alterações' }).first().click();

  await expect(page.getByText('Use uma imagem PNG, JPEG, WebP ou GIF.')).toBeVisible();
});

test('covers become WebP of at most 1920x1080, served with nosniff', async ({ writerPage: page, request }) => {
  const url = await createNovel(page, { title: 'Capa grande', cover: await pngImage(4000, 3000, '#7d2a26') });
  const src = await page.locator('.book-mock img').getAttribute('src');
  const response = await request.get(src!);
  const bytes = await response.body();

  expect(response.headers()['content-type']).toBe('image/webp');
  expect(response.headers()['x-content-type-options']).toBe('nosniff');
  expect(bytes.subarray(8, 12).toString('ascii')).toBe('WEBP');
  expect(bytes.byteLength).toBeLessThan(2 * 1024 * 1024);
  expect(url).toMatch(/novels/);
  expect((await request.get('/media/covers/..%2F..%2Fpackage.json')).status()).toBe(404);
});

test('a profile picture is uploaded by dropping it on the field and shown on the profile', async ({
  writerPage: page,
}) => {
  await page.goto('/write/profile/edit');
  await page.waitForLoadState('networkidle');
  const buffer = (await pngImage(300, 300, '#2f4b3a')).toString('base64');
  const dataTransfer = await page.evaluateHandle((data) => {
    const transfer = new DataTransfer();
    const bytes = Uint8Array.from(atob(data), (character) => character.charCodeAt(0));
    transfer.items.add(new File([bytes], 'me.png', { type: 'image/png' }));

    return transfer;
  }, buffer);
  await page.locator('#field-avatar').locator('..').dispatchEvent('drop', { dataTransfer });
  await expect(page.locator('img[src^="data:image/webp"]')).toBeVisible();
  await page.getByRole('button', { name: 'Salvar alterações' }).click();

  await expect(page).toHaveURL('/write/profile');
  await expect(page.locator('img[src^="/media/avatars/"]')).toBeVisible();
});

test('an image can be added in the middle of the additional details', async ({ writerPage: page }) => {
  await page.goto('/write/novels/new');
  await page.locator('.ProseMirror').click();
  await page.keyboard.type('Antes da imagem.');
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Inserir imagem' }).click();
  await (await chooser).setFiles({ name: 'map.png', mimeType: 'image/png', buffer: await pngImage(200, 120) });

  await expect(page.locator('.ProseMirror img')).toHaveAttribute(
    'src',
    /^\/media\/inline\/[0-9a-f]{24}\/[0-9a-f-]+\.webp$/,
  );
});
