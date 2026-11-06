'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { safeRedirectPath } from '@/lib/auth/request';
import { signIn, signUp, type AuthResult } from '@/lib/auth/service';
import { createSessionRepository } from '@/lib/auth/session';
import { REFRESH_COOKIE } from '@/lib/auth/tokens';
import { getDatabase } from '@/lib/db/client';
import { formValues, type FormState } from '@/lib/form';
import { authDependencies, clientAddress } from '@/server/session';
import { clearTokenCookies, storeTokenCookies, tokenPair } from '@/server/tokens';

const finish = async (result: AuthResult, values: Record<string, string>, next: unknown): Promise<FormState> => {
  if (!result.ok) {
    return {
      error: result.error,
      errorValues: result.retryAfterMinutes ? { minutes: result.retryAfterMinutes } : undefined,
      fieldErrors: result.fieldErrors,
      values,
    };
  }

  await storeTokenCookies(await tokenPair(result, result.refreshToken));
  redirect(safeRedirectPath(next));
};

export async function signInAction(_previous: FormState, formData: FormData): Promise<FormState> {
  const input = formValues(formData, ['email', 'password']);
  const result = await signIn(await authDependencies(), input, await clientAddress());

  return finish(result, { email: input.email }, formData.get('next'));
}

export async function signUpAction(_previous: FormState, formData: FormData): Promise<FormState> {
  const input = formValues(formData, ['name', 'username', 'email', 'password']);
  const result = await signUp(await authDependencies(), input, await clientAddress());

  return finish(result, { name: input.name, username: input.username, email: input.email }, '/write');
}

export async function signOutAction(): Promise<void> {
  const token = (await cookies()).get(REFRESH_COOKIE)?.value;

  if (token) {
    await createSessionRepository(await getDatabase()).revoke(token);
  }

  await clearTokenCookies();
  redirect('/login');
}
