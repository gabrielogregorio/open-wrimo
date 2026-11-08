import { ObjectId } from 'mongodb';
import { collections } from '@/lib/db/collections';
import { createReportRepository } from '@/lib/moderation/reports';
import { NotFoundError, actAs, createWriter, form, redirectOf, setRequestHeaders, testDb } from '@/test/next-server';
import { purgeAccountAction, reopenReportAction, reportAction, resolveReportAction } from './moderation';

const REPORT = { target: 'profile', reason: 'spam', details: 'Selling things.' };
const DAY = 86_400_000;

const reportsOf = () => createReportRepository(testDb()).listReports({ status: 'open' });

describe('reporting a public page', () => {
  it('works signed out or in, and keeps who sent it', async () => {
    const reported = await createWriter({ isPublic: true });
    const reporter = await createWriter();
    setRequestHeaders({ 'user-agent': 'Firefox' });

    await expect(reportAction({}, form({ ...REPORT, username: reported.username }))).resolves.toEqual({ saved: true });
    actAs(reporter);
    await expect(reportAction({}, form({ ...REPORT, username: reported.username }))).resolves.toEqual({ saved: true });

    const stored = await collections(testDb()).reports.find().sort({ _id: 1 }).toArray();
    expect(stored.map((report) => report.reporterUserId?.toHexString() ?? null)).toEqual([null, reporter.id]);
    expect(stored[0].reporterUserAgent).toBe('Firefox');
  });

  it('cannot point at a private profile', async () => {
    const hidden = await createWriter({ isPublic: false });

    await expect(reportAction({}, form({ ...REPORT, username: hidden.username }))).resolves.toMatchObject({
      error: expect.any(String),
    });
    expect((await reportsOf()).total).toBe(0);
  });
});

describe('admin actions', () => {
  const openReport = async (): Promise<string> => {
    const reported = await createWriter({ isPublic: true });
    actAs(null);
    await reportAction({}, form({ ...REPORT, username: reported.username }));

    return (await reportsOf()).reports[0].id;
  };

  it('resolve and reopen reports for an admin only', async () => {
    const reportId = await openReport();

    actAs(null);
    await expect(resolveReportAction(reportId)).rejects.toBeInstanceOf(NotFoundError);
    actAs(await createWriter());
    await expect(resolveReportAction(reportId)).rejects.toBeInstanceOf(NotFoundError);
    actAs(await createWriter({ isAdmin: true, deletionRequestedAt: new Date() }));
    await expect(reopenReportAction(reportId)).rejects.toBeInstanceOf(NotFoundError);
    expect((await reportsOf()).total).toBe(1);

    actAs(await createWriter({ isAdmin: true }));
    await resolveReportAction(reportId);
    expect((await reportsOf()).total).toBe(0);
    await reopenReportAction(reportId);
    expect((await reportsOf()).total).toBe(1);
  });

  it('delete an account for good only for an admin who ticked the box, after the grace period', async () => {
    const leaving = await createWriter({ deletionRequestedAt: new Date(Date.now() - 40 * DAY) });
    const users = collections(testDb()).users;

    actAs(await createWriter());
    await expect(purgeAccountAction(leaving.id, form({ confirm: 'on' }))).rejects.toBeInstanceOf(NotFoundError);

    actAs(await createWriter({ isAdmin: true }));
    await expect(redirectOf(() => purgeAccountAction(leaving.id, form({})))).resolves.toBe(
      `/write/admin/exclusoes?confirmar=${leaving.id}`,
    );
    expect(await users.countDocuments({ _id: new ObjectId(leaving.id) })).toBe(1);

    await expect(redirectOf(() => purgeAccountAction(leaving.id, form({ confirm: 'on' })))).resolves.toBe(
      '/write/admin/exclusoes',
    );
    expect(await users.countDocuments({ _id: new ObjectId(leaving.id) })).toBe(0);
  });
});
