import type { SessionUser } from '@/lib/auth/session';
import { getDatabase } from '@/lib/db/client';
import { createReportRepository } from '@/lib/moderation/reports';
import { currentWriter } from './session';

/** The signed-in admin whose account is in order, or null. Admin rights are only ever set in the database. */
export const currentAdmin = async (): Promise<SessionUser | null> => {
  const writer = await currentWriter();

  if (typeof writer === 'string') {
    return null;
  }

  return (await createReportRepository(await getDatabase()).isAdmin(writer.id)) ? writer : null;
};
