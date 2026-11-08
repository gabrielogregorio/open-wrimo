import { createNovel, expect, test } from './fixtures';

const MISSING = 'Esta página não está no livro.';

test('a private profile is not found, a public one shows only public novels', async ({
  writerPage: page,
  writer,
  browser,
}) => {
  await createNovel(page, { title: 'Romance Aberto', isPublic: true });
  await createNovel(page, { title: 'Diário Secreto' });
  const visitor = await browser.newPage();

  await visitor.goto(`/u/${writer.username}`);
  await expect(visitor.getByRole('heading', { level: 1 })).toHaveText(MISSING);
  await expect(visitor.getByText(writer.name)).toHaveCount(0);

  await page.goto('/write/profile/edit');
  await page.getByRole('textbox', { name: 'Sobre mim' }).fill('Escrevo de madrugada.');
  await page.getByLabel('Qualquer pessoa com o link pode ver meu perfil').check();
  await page.getByRole('checkbox', { name: 'Números' }).uncheck();
  await page.getByRole('button', { name: 'Salvar alterações' }).click();
  await expect(page.getByRole('link', { name: 'Ver meu perfil público' })).toBeVisible();

  await visitor.goto(`/u/${writer.username}`);
  await expect(visitor.getByRole('heading', { level: 1, name: writer.name })).toBeVisible();
  await expect(visitor.getByText('Escrevo de madrugada.')).toBeVisible();
  await expect(visitor.getByRole('heading', { name: 'Romance Aberto' })).toBeVisible();
  await expect(visitor.getByText('Diário Secreto')).toHaveCount(0);
  await expect(visitor.getByText('Palavras escritas')).toHaveCount(0);
  await expect(visitor.getByRole('link', { name: 'Atualizar' })).toHaveCount(0);
  await visitor.close();
});

test('the username and name change on the profile, and taken usernames are refused', async ({
  writerPage: page,
  browser,
}) => {
  const other = await browser.newPage();
  await other.goto('/register');
  await other.getByLabel('Nome', { exact: true }).fill('Ocupado');
  await other.getByLabel('Nome de usuário').fill('ocupado-xyz');
  await other.getByLabel('E-mail').fill(`ocupado-${Date.now()}@example.com`);
  await other.getByLabel('Senha', { exact: true }).fill('a long enough secret');
  await other.getByRole('checkbox', { name: /Li e aceito os/ }).check();
  await other.getByRole('button', { name: 'Criar conta' }).click();
  await other.close();

  await page.goto('/write/profile/edit');
  await page.getByLabel('Nome de usuário').fill('ocupado-xyz');
  await page.getByRole('button', { name: 'Salvar alterações' }).click();
  await expect(page.getByText('Esse nome de usuário já está em uso.')).toBeVisible();

  await page.getByLabel('Nome', { exact: true }).fill('Nome Novo');
  await page.getByLabel('Nome de usuário').fill(`novo-${Date.now() % 100000}`);
  await page.getByRole('button', { name: 'Salvar alterações' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Nome Novo' })).toBeVisible();
});

test('the community lists public writers and finds them by name', async ({ writerPage: page, writer }) => {
  await page.goto('/write/profile/edit');
  await page.getByLabel('Qualquer pessoa com o link pode ver meu perfil').check();
  await page.getByRole('button', { name: 'Salvar alterações' }).click();
  await expect(page).toHaveURL('/write/profile');

  await page.getByRole('link', { name: 'Comunidade' }).click();
  await page.getByLabel('Buscar por nome ou nome de usuário').fill(writer.username);
  await page.getByRole('button', { name: 'Buscar' }).click();

  await expect(page.getByRole('link', { name: new RegExp(writer.name) })).toBeVisible();
  await page.getByRole('link', { name: new RegExp(writer.name) }).click();
  await expect(page).toHaveURL(`/u/${writer.username}`);
});
