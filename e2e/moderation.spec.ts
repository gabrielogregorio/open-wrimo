import { expect, signUp, test, uniqueWriter, updateAccount } from './fixtures';

const DAY = 86_400_000;

test('a visitor reports a public profile, only an admin sees it and resolves it', async ({
  writerPage: page,
  writer,
  browser,
}) => {
  await page.goto('/write/profile/edit');
  await page.getByLabel('Qualquer pessoa com o link pode ver meu perfil').check();
  await page.getByRole('button', { name: 'Salvar alterações' }).click();
  await expect(page.getByRole('link', { name: 'Ver meu perfil público' })).toBeVisible();

  const visitor = await browser.newPage();
  await visitor.goto(`/u/${writer.username}`);
  await visitor.getByRole('button', { name: 'Denunciar perfil' }).click();
  await visitor.getByLabel('Motivo').selectOption({ label: 'Spam ou golpe' });
  await visitor.getByRole('button', { name: 'Enviar denúncia' }).click();
  await expect(visitor.getByText('Obrigado. Sua denúncia foi enviada para a moderação.')).toBeVisible();
  await visitor.close();

  const moderator = uniqueWriter('mod');
  const adminPage = await browser.newPage();
  await signUp(adminPage, moderator);
  await adminPage.goto('/write/admin/reports');
  await expect(adminPage.getByRole('heading', { level: 1 })).toHaveText('Esta página não está no livro.');

  await updateAccount(moderator.username, { isAdmin: true });
  await adminPage.reload();
  const report = adminPage.getByRole('listitem').filter({ hasText: `@${writer.username}` });
  await expect(report).toContainText('Spam ou golpe');
  await report.getByRole('button', { name: 'Marcar como resolvida' }).click();
  await expect(report).toHaveCount(0);
  await adminPage.close();
});

test('an admin deletes for good an account past the grace period, only after ticking the box', async ({
  writerPage: adminPage,
  writer: moderator,
  browser,
}) => {
  const leaving = uniqueWriter('leave');
  const leavingPage = await browser.newPage();
  await signUp(leavingPage, leaving);
  await leavingPage.close();
  await updateAccount(leaving.username, { deletionRequestedAt: new Date(Date.now() - 40 * DAY) });
  await updateAccount(moderator.username, { isAdmin: true });

  await adminPage.goto('/write/admin/exclusoes');
  const item = adminPage.getByRole('listitem').filter({ hasText: `@${leaving.username}` });
  await item.getByRole('button', { name: 'Excluir definitivamente' }).click();
  await expect(item.getByText('Marque a caixa para confirmar.')).toBeVisible();

  await item.getByRole('checkbox').check();
  await item.getByRole('button', { name: 'Excluir definitivamente' }).click();
  await expect(item).toHaveCount(0);
});

test('a writer with old terms accepts the new ones before writing, and the API waits for it', async ({
  writerPage: page,
  writer,
  request,
}) => {
  await updateAccount(writer.username, { termsVersion: '2020-01-01' });
  const signedIn = await request.post('/api/v1/auth/login', {
    data: { email: writer.email, password: 'a long enough secret' },
  });
  const headers = { authorization: `Bearer ${(await signedIn.json()).accessToken}` };
  const novel = { multipart: { title: 'Pela API', status: 'in-progress', type: 'novel', genres: 'Drama' }, headers };

  expect((await request.post('/api/v1/novels', novel)).status()).toBe(403);

  await page.goto('/write/stats');
  await page.waitForURL('**/termos/aceitar');
  await expect(page.getByRole('heading', { name: 'Os termos mudaram' })).toBeVisible();
  await page.getByRole('button', { name: 'Li e aceito os novos termos' }).click();
  await page.waitForURL('**/write');

  expect((await request.post('/api/v1/novels', novel)).status()).toBe(201);
});
