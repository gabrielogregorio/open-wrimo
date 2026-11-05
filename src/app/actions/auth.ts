'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { safeRedirectPath, sessionCookieOptions } from '@/lib/auth/request';
import { signIn, signUp, type AuthResult } from '@/lib/auth/service';
import { SESSION_COOKIE, SESSION_TTL_MS, createSessionRepository } from '@/lib/auth/session';
import { getDatabase } from '@/lib/db/client';
import { getEnvironment } from '@/lib/env';
import { formValues, type FormState } from '@/lib/form';
import { authDependencies, clientAddress } from '@/server/session';

const finish = async (result: AuthResult, values: Record<string, string>, next: unknown): Promise<FormState> => {
  if (!result.ok) {
    return {
      error: result.error,
      errorValues: result.retryAfterMinutes ? { minutes: result.retryAfterMinutes } : undefined,
      fieldErrors: result.fieldErrors,
      values,
    };
  }

  (await cookies()).set(SESSION_COOKIE, result.token, sessionCookieOptions(getEnvironment().APP_URL, SESSION_TTL_MS));
  redirect(safeRedirectPath(next));
};

export async function signInAction(_previous: FormState, formData: FormData): Promise<FormState> {
  const input = formValues(formData, ['email', 'password']);
  const result = await signIn(await authDependencies(), input, await clientAddress());

  return finish(result, { email: input.email }, formData.get('next'));
}

export async function signUpAction(_previous: FormState, formData: FormData): Promise<FormState> {
  const input = formValues(formData, ['name', 'email', 'password']);
  const result = await signUp(await authDependencies(), input, await clientAddress());

  return finish(result, { name: input.name, email: input.email }, '/write');
}

export async function signOutAction(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (token) {
    await createSessionRepository(await getDatabase()).revoke(token);
  }

  cookieStore.delete(SESSION_COOKIE);
  redirect('/login');
}
