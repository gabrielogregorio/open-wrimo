'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { safeRedirectPath } from '@/lib/auth/request';
import { signIn, signUp, type AuthResult } from '@/lib/auth/service';
import { createSessionRepository } from '@/lib/auth/session';
import { REFRESH_COOKIE } from '@/lib/auth/tokens';
import { getDatabase } from '@/lib/db/client';
import { formValues, type FormState } from '@/lib/form';
import { authDependencies, clientInfo } from '@/server/session';
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
  const client = await clientInfo();
  const result = await signIn(await authDependencies(), input, client.address, client.userAgent);

  return finish(result, { email: input.email }, formData.get('next'));
}

export async function signUpAction(_previous: FormState, formData: FormData): Promise<FormState> {
  const input = formValues(formData, ['name', 'username', 'email', 'password', 'acceptTerms']);
  const client = await clientInfo();
  const result = await signUp(await authDependencies(), input, client.address, client.userAgent);

  return finish(
    result,
    { name: input.name, username: input.username, email: input.email, acceptTerms: input.acceptTerms ?? '' },
    '/write',
  );
}

export async function signOutAction(): Promise<void> {
  const token = (await cookies()).get(REFRESH_COOKIE)?.value;

  if (token) {
    await createSessionRepository(await getDatabase()).revoke(token);
  }

  await clearTokenCookies();
  redirect('/login');
}
