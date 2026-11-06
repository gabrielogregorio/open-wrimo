import type { Page } from '@playwright/test';
import { PASSWORD, expect, signIn, signUp, test, uniqueWriter } from './fixtures';

const WRONG = 'E-mail ou senha incorretos.';

const formAlert = (page: Page) => page.locator('form').getByRole('alert');

const signOut = async (page: Page): Promise<void> => {
  await page.getByRole('button', { name: 'Sair' }).click();
  await expect(page).toHaveURL('/login');
};

test('a writer signs up, signs out and signs back in', async ({ page }) => {
  const writer = uniqueWriter('cycle');
  await signUp(page, writer);

  await expect(page.getByText(`Olá, ${writer.name}`)).toBeVisible();
  await signOut(page);
  await signIn(page, writer.email.toUpperCase());

  await expect(page).toHaveURL('/write');
});

test('the username is typed lowercase with dashes and must be unique', async ({ page }) => {
  const first = uniqueWriter('dup');
  await signUp(page, first);
  await signOut(page);

  await page.goto('/register');
  await page.getByLabel('Nome de usuário').pressSequentially('Ção Silva!');
  await expect(page.getByLabel('Nome de usuário')).toHaveValue('cao-silva-');
  await page.getByLabel('Nome', { exact: true }).fill('Outra pessoa');
  await page.getByLabel('Nome de usuário').fill(first.username);
  await page.getByLabel('E-mail').fill(`other-${first.email}`);
  await page.getByLabel('Senha').fill(PASSWORD);
  await page.getByRole('button', { name: 'Criar conta' }).click();

  await expect(page.getByText('Esse nome de usuário já está em uso.')).toBeVisible();
});

test('sign up explains what is wrong with each field', async ({ page }) => {
  await page.goto('/register');
  await page.getByLabel('E-mail').fill('not-an-email');
  await page.getByLabel('Senha').fill('short');
  await page.getByRole('button', { name: 'Criar conta' }).click();

  await expect(page.getByText('Informe um e-mail válido.')).toBeVisible();
  await expect(page.getByText('Use de 10 a 128 caracteres.')).toBeVisible();
  await expect(page.getByText('Use de 3 a 20 letras minúsculas, números e hífens.')).toBeVisible();
});

test('private pages ask for a session and return to the page asked for', async ({ page }) => {
  const writer = uniqueWriter('return');
  await signUp(page, writer);
  await signOut(page);

  await page.goto('/write/stats');
  await expect(page).toHaveURL('/login?next=%2Fwrite%2Fstats');
  await signIn(page, writer.email);

  await expect(page).toHaveURL('/write/stats');
});

test('tokens live in httpOnly cookies and a forged access token opens nothing', async ({ page, context }) => {
  await signUp(page, uniqueWriter('cookies'));
  const cookies = await context.cookies();

  expect(
    cookies.filter((cookie) => cookie.name.startsWith('openwrimo-') && cookie.name !== 'openwrimo-time-zone'),
  ).toEqual([
    expect.objectContaining({ name: 'openwrimo-access', httpOnly: true, sameSite: 'Lax' }),
    expect.objectContaining({ name: 'openwrimo-refresh', httpOnly: true, sameSite: 'Lax' }),
  ]);

  await context.clearCookies();
  await context.addCookies([{ name: 'openwrimo-access', value: 'forged.jwt.token', url: 'http://127.0.0.1:8921' }]);
  await page.goto('/write');

  await expect(page).toHaveURL('/login?next=%2Fwrite');
});

test('an expired access token is renewed from the refresh token, and signing out revokes it', async ({
  page,
  context,
}) => {
  await signUp(page, uniqueWriter('renew'));
  const refreshOf = async () => (await context.cookies()).find((cookie) => cookie.name === 'openwrimo-refresh')?.value;
  const firstRefresh = await refreshOf();

  await context.clearCookies({ name: 'openwrimo-access' });
  await page.goto('/write/profile');

  await expect(page).toHaveURL('/write/profile');
  expect(await refreshOf()).not.toBe(firstRefresh);

  const lastRefresh = await refreshOf();
  await signOut(page);
  await context.addCookies([{ name: 'openwrimo-refresh', value: lastRefresh!, url: 'http://127.0.0.1:8921' }]);
  await page.goto('/write');

  await expect(page).toHaveURL('/login?next=%2Fwrite');
});

test('a wrong password and an unknown email get the same answer', async ({ page }) => {
  const writer = uniqueWriter('wrong');
  await signUp(page, writer);
  await signOut(page);

  await signIn(page, writer.email, 'not the password at all');
  await expect(formAlert(page)).toHaveText(WRONG);
  await expect(page.getByLabel('Senha')).toHaveValue('');
  await signIn(page, 'nobody-here@example.com');

  await expect(formAlert(page)).toHaveText(WRONG);
});

test('the sixth try for one email is blocked, even with the right password', async ({ page }) => {
  const writer = uniqueWriter('locked');
  await signUp(page, writer);
  await signOut(page);

  for (let attempt = 1; attempt <= 5; attempt += 1) {
    await signIn(page, writer.email, `wrong guess ${attempt}`);
    await expect(page.getByLabel('Senha')).toHaveValue('');
    await expect(formAlert(page)).toHaveText(WRONG);
  }

  await signIn(page, writer.email);

  await expect(formAlert(page)).toHaveText('Muitas tentativas. Tente de novo em 15 minutos.');
});
