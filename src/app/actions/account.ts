'use server';

import { redirect } from 'next/navigation';
import { createAccessLog, createAccountRepository } from '@/lib/account/account';
import { safeRedirectPath } from '@/lib/auth/request';
import { getDatabase } from '@/lib/db/client';
import { TERMS_VERSION } from '@/lib/legal/terms';
import { clientInfo, requireUser } from '@/server/session';
import { clearTokenCookies } from '@/server/tokens';

const record = async (userId: string, action: 'terms' | 'deletion-request' | 'deletion-cancel'): Promise<void> => {
  const database = await getDatabase();
  await createAccessLog(database).record({ userId, action, ...(await clientInfo()) }, new Date());
};

export async function acceptTermsAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  await createAccountRepository(await getDatabase()).acceptTerms(user.id, TERMS_VERSION, new Date());
  await record(user.id, 'terms');
  redirect(safeRedirectPath(formData.get('next')));
}

export async function requestDeletionAction(formData: FormData): Promise<void> {
  const user = await requireUser();

  if (formData.get('confirm') !== 'on') {
    redirect('/conta?confirmar=1');
  }

  await createAccountRepository(await getDatabase()).requestDeletion(user.id, new Date());
  await record(user.id, 'deletion-request');
  await clearTokenCookies();
  redirect('/conta/excluida');
}

export async function cancelDeletionAction(): Promise<void> {
  const user = await requireUser();
  await createAccountRepository(await getDatabase()).cancelDeletion(user.id);
  await record(user.id, 'deletion-cancel');
  redirect('/write');
}
