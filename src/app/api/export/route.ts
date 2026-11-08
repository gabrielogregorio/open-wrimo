import { exportNotebook } from '@/lib/writing/service';
import { getCurrentUser, getTimeZone, writingContextFor } from '@/server/session';

export const dynamic = 'force-dynamic';

export async function GET(): Promise<Response> {
  const user = await getCurrentUser();

  if (!user) {
    return new Response(null, { status: 401 });
  }

  // The copy of one's own data stays open while the account waits for deletion or new terms.
  const context = await writingContextFor(user.id, await getTimeZone());
  const notebook = await exportNotebook(context);

  return new Response(JSON.stringify({ ...notebook, exportedAt: context.now.toISOString() }, null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="open-wrimo-${context.today}.json"`,
      'Cache-Control': 'no-store',
    },
  });
}
