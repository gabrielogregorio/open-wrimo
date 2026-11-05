import type { Page } from '@playwright/test';
import { PASSWORD, expect, signUp, test, uniqueEmail } from './fixtures';

const WRONG_GUESSES = ['wrong guess 1', 'wrong guess 2', 'wrong guess 3', 'wrong guess 4', 'wrong guess 5'];

const guessWrong = async (page: Page, email: string): Promise<void> => {
  for (const guess of WRONG_GUESSES) {
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password').fill(guess);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByLabel('Password')).toHaveValue('');
    await expect(page.locator('form').getByRole('alert')).toHaveText('Invalid email or password.');
  }
};

test('a new reader signs up, signs out and signs back in', async ({ page }) => {
  const email = uniqueEmail('cycle');
  await signUp(page, { name: 'Rui', email });

  await expect(page.getByText('Hello, Rui')).toBeVisible();
  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page).toHaveURL('/login');

  await page.getByLabel('Email').fill(email.toUpperCase());
  await page.getByLabel('Password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();

  await expect(page).toHaveURL('/shelf');
});

test('the shelf asks for a session and returns to the page asked for', async ({ page }) => {
  const email = uniqueEmail('return');
  await signUp(page, { name: 'Rui', email });
  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page).toHaveURL('/login');

  await page.goto('/shelf?status=reading');
  await expect(page).toHaveURL('/login?next=%2Fshelf%3Fstatus%3Dreading');

  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();

  await expect(page).toHaveURL('/shelf?status=reading');
});

test('a forged session cookie does not open the shelf', async ({ page, context }) => {
  await context.addCookies([{ name: 'folio-session', value: 'forged', url: 'http://127.0.0.1:8921' }]);

  await page.goto('/shelf');

  await expect(page).toHaveURL('/login');
});

test('a wrong password and an unknown email get the same answer', async ({ page }) => {
  const email = uniqueEmail('wrong');
  await signUp(page, { name: 'Rui', email });
  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page).toHaveURL('/login');

  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill('not the password');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByLabel('Password')).toHaveValue('');
  await expect(page.locator('form').getByRole('alert')).toHaveText('Invalid email or password.');

  await page.getByLabel('Email').fill(uniqueEmail('nobody'));
  await page.getByLabel('Password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.locator('form').getByRole('alert')).toHaveText('Invalid email or password.');
});

test('the sixth try for one email is blocked, even with the right password', async ({ page }) => {
  const email = uniqueEmail('limited');
  await signUp(page, { name: 'Rui', email });
  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page).toHaveURL('/login');

  await guessWrong(page, email);

  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();

  await expect(page.locator('form').getByRole('alert')).toHaveText('Too many attempts. Try again in 15 minutes.');
  await expect(page).toHaveURL('/login');
});

test('sign up explains what is wrong with each field', async ({ page }) => {
  await page.goto('/register');
  await page.getByLabel('Email').fill('not-an-email');
  await page.getByLabel('Password').fill('short');
  await page.getByRole('button', { name: 'Create account' }).click();

  await expect(page.getByLabel('Name')).toHaveAccessibleDescription('Enter a name up to 80 characters.');
  await expect(page.getByLabel('Email')).toHaveAccessibleDescription('Enter a valid email address.');
  await expect(page.getByLabel('Password')).toHaveAccessibleDescription(
    'At least 10 characters. Use 10 to 128 characters.',
  );
});
