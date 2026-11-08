import { expect, signIn, test } from './fixtures';

test('the terms are linked in the footer and shown in full', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('contentinfo').getByRole('link', { name: 'Termos de uso' }).click();
  await page.waitForURL('**/termos');

  await expect(page.getByRole('heading', { level: 1, name: 'Termos de Uso e Política de Privacidade' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '12. Exclusão da conta' })).toBeVisible();
});

test('a writer exports the data, asks to delete the account, is signed out and can cancel by signing in', async ({
  writerPage: page,
  writer,
}) => {
  await page.goto('/conta');
  await page.waitForLoadState('networkidle');

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('link', { name: 'Baixar meus dados (.json)' }).click(),
  ]);
  expect(download.suggestedFilename()).toMatch(/\.json$/);

  await page.getByRole('button', { name: 'Excluir minha conta' }).click();
  await expect(page.getByText('Marque a caixa para confirmar.')).toBeVisible();
  await page.getByRole('checkbox', { name: /Entendo, e já exportei/ }).check();
  await page.getByRole('button', { name: 'Excluir minha conta' }).click();
  await page.waitForURL('**/conta/excluida');
  await expect(page.getByRole('heading', { name: 'Sua conta está marcada para exclusão' })).toBeVisible();

  await page.goto('/write');
  await page.waitForURL(/\/login/);
  await signIn(page, writer.email);
  await page.waitForURL('**/conta');
  await page.goto('/write');
  await page.waitForURL('**/conta');
  await page.getByRole('button', { name: 'Cancelar a exclusão e manter minha conta' }).click();
  await page.waitForURL('**/write');
  await expect(page.getByRole('heading', { name: 'Escrivaninha' })).toBeVisible();
});
