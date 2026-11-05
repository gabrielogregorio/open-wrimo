import { exportNotebook } from '@/lib/writing/service';
import { getCurrentUser, writingContext } from '@/server/session';

export const dynamic = 'force-dynamic';

export async function GET(): Promise<Response> {
  if (!(await getCurrentUser())) {
    return new Response(null, { status: 401 });
  }

  const context = await writingContext();
  const notebook = await exportNotebook(context);

  return new Response(JSON.stringify({ ...notebook, exportedAt: context.now.toISOString() }, null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="open-wrimo-${context.today}.json"`,
      'Cache-Control': 'no-store',
    },
  });
}
