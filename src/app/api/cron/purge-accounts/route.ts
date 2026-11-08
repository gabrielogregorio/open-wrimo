import { timingSafeEqual } from 'node:crypto';
import { purgeDeletedAccounts } from '@/lib/account/account';
import { getDatabase } from '@/lib/db/client';
import { getEnvironment } from '@/lib/env';
import { json } from '@/server/api';
import { getImageStorage } from '@/server/session';

export const dynamic = 'force-dynamic';

const authorized = (header: string | null, secret: string | undefined): boolean => {
  if (!secret || !header) {
    return false;
  }

  const expected = Buffer.from(`Bearer ${secret}`);
  const given = Buffer.from(header);

  return expected.length === given.length && timingSafeEqual(expected, given);
};

// Called once a day by Vercel Cron (vercel.json) with "Authorization: Bearer <CRON_SECRET>". It deletes
// for good the accounts whose 30-day grace period is over, well within the 180 days the terms promise.
export async function GET(request: Request): Promise<Response> {
  if (!authorized(request.headers.get('authorization'), getEnvironment().CRON_SECRET)) {
    return json({ error: 'Not found.' }, 404);
  }

  const deleted = await purgeDeletedAccounts(await getDatabase(), getImageStorage(), new Date());

  return json({ deleted });
}
