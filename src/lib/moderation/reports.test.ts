import { ObjectId } from 'mongodb';
import type { RateLimiter } from '@/lib/auth/rate-limit';
import { collections } from '@/lib/db/collections';
import { startTestDatabase, type TestDatabase } from '@/test/mongo';
import { formatReportTime, REPORT_REASON_LABELS } from './labels';
import {
  REPORTS_PAGE_SIZE,
  REPORT_RULES,
  createReportRepository,
  reportInputSchema,
  submitReport,
  type ReportDependencies,
  type ReportRepository,
} from './reports';

const NOW = new Date('2026-11-08T15:30:00.000Z');
const LATER = new Date('2026-11-08T16:00:00.000Z');

const allowAll: RateLimiter = {
  consume: vi.fn(async () => ({ allowed: true, retryAfterMs: 0 })),
  reset: vi.fn(async () => undefined),
};

const anonymous = { userId: null, address: '203.0.113.7', userAgent: 'Firefox' };

describe('labels', () => {
  it('names every reason', () => {
    expect(Object.keys(REPORT_REASON_LABELS)).toHaveLength(6);
  });

  it('formats report times in Brasília', () => {
    expect(formatReportTime(NOW)).toBe('08/11/2026, 12:30');
  });
});

describe('reportInputSchema', () => {
  const valid = { target: 'profile', username: ' Ana ', projectId: '', reason: 'spam', details: '' };

  it('accepts a profile report and normalizes the username', () => {
    expect(reportInputSchema.parse(valid)).toEqual({ ...valid, username: 'ana' });
  });

  it('requires details when the reason is "other"', () => {
    const result = reportInputSchema.safeParse({ ...valid, reason: 'other', details: '   ' });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]).toMatchObject({ path: ['details'], message: 'Tell us what is wrong.' });
  });

  it('limits the details to 2000 characters', () => {
    expect(reportInputSchema.safeParse({ ...valid, details: 'a'.repeat(2000) }).success).toBe(true);
    expect(reportInputSchema.safeParse({ ...valid, details: 'a'.repeat(2001) }).success).toBe(false);
  });

  it('rejects unknown reasons and targets', () => {
    expect(reportInputSchema.safeParse({ ...valid, reason: 'boring' }).success).toBe(false);
    expect(reportInputSchema.safeParse({ ...valid, target: 'post' }).success).toBe(false);
  });

  it('needs a valid novel id for a novel report', () => {
    expect(reportInputSchema.safeParse({ ...valid, target: 'novel', projectId: 'nope' }).success).toBe(false);
    expect(
      reportInputSchema.safeParse({ ...valid, target: 'novel', projectId: new ObjectId().toHexString() }).success,
    ).toBe(true);
  });
});

describe('reports', () => {
  let testDatabase: TestDatabase;
  let reports: ReportRepository;
  let dependencies: ReportDependencies;
  let writerId: ObjectId;
  let reporterId: ObjectId;
  let publicNovelId: ObjectId;
  let privateNovelId: ObjectId;
  let strangerNovelId: ObjectId;

  const addUser = async (username: string, extra: Record<string, unknown> = {}): Promise<ObjectId> => {
    const { insertedId } = await collections(testDatabase.database).users.insertOne({
      email: `${username}@example.com`,
      username,
      name: username.toUpperCase(),
      passwordHash: 'hash',
      createdAt: NOW,
      ...extra,
    });

    return insertedId;
  };

  const addProfile = async (userId: ObjectId, isPublic: boolean): Promise<void> => {
    await collections(testDatabase.database).profiles.insertOne({
      userId,
      bio: '',
      location: '',
      writingTime: '',
      favoriteBooks: '',
      favoriteAuthors: '',
      avatarUrl: null,
      avatarKey: null,
      isPublic,
      updatedAt: NOW,
    });
  };

  const addNovel = async (userId: ObjectId, title: string, isPublic: boolean): Promise<ObjectId> => {
    const { insertedId } = await collections(testDatabase.database).projects.insertOne({
      userId,
      title,
      status: 'in-progress',
      type: 'novel',
      genres: [],
      summary: '',
      excerpt: '',
      pinterestUrl: '',
      playlistUrl: '',
      featured: false,
      isPublic,
      awards: [],
      coverUrl: null,
      coverKey: null,
      createdAt: NOW,
      updatedAt: NOW,
    });

    return insertedId;
  };

  const input = (overrides: Record<string, string> = {}) => ({
    target: 'profile',
    username: 'writer',
    projectId: '',
    reason: 'spam',
    details: 'Links to a casino.',
    ...overrides,
  });

  beforeAll(async () => {
    testDatabase = await startTestDatabase();
    reports = createReportRepository(testDatabase.database);
    dependencies = { reports, limiter: allowAll, now: NOW };
    writerId = await addUser('writer');
    reporterId = await addUser('reporter', { isAdmin: false });
    const hiddenId = await addUser('hidden');
    const strangerId = await addUser('stranger');
    await addUser('admin', { isAdmin: true });
    await addProfile(writerId, true);
    await addProfile(hiddenId, false);
    await addProfile(strangerId, true);
    publicNovelId = await addNovel(writerId, 'Rio de Janeiro', true);
    privateNovelId = await addNovel(writerId, 'Gaveta', false);
    strangerNovelId = await addNovel(strangerId, 'Outro', true);
  });

  afterAll(async () => {
    await testDatabase.stop();
  });

  beforeEach(async () => {
    await collections(testDatabase.database).reports.deleteMany({});
  });

  it('alerts the admin with the reason after storing the report', async () => {
    const alert = vi.fn(async () => true);

    expect(await submitReport({ ...dependencies, alert }, input(), anonymous)).toEqual({ saved: true });
    expect(alert).toHaveBeenCalledWith('spam');
    expect(await collections(testDatabase.database).reports.countDocuments({})).toBe(1);
  });

  it('stores an anonymous profile report as open', async () => {
    expect(await submitReport(dependencies, input(), anonymous)).toEqual({ saved: true });

    const stored = await collections(testDatabase.database).reports.findOne({});

    expect(stored).toMatchObject({
      target: 'profile',
      targetUserId: writerId,
      targetProjectId: null,
      reason: 'spam',
      details: 'Links to a casino.',
      reporterUserId: null,
      reporterAddress: '203.0.113.7',
      reporterUserAgent: 'Firefox',
      status: 'open',
      createdAt: NOW,
      resolvedAt: null,
    });
  });

  it('stores who reported a public novel when signed in', async () => {
    const reporter = { userId: reporterId.toHexString(), address: null, userAgent: 'Chrome' };
    const result = await submitReport(
      dependencies,
      input({ target: 'novel', projectId: publicNovelId.toHexString(), reason: 'copyright' }),
      reporter,
    );

    expect(result).toEqual({ saved: true });
    expect(await collections(testDatabase.database).reports.findOne({})).toMatchObject({
      target: 'novel',
      targetUserId: writerId,
      targetProjectId: publicNovelId,
      reporterUserId: reporterId,
      reporterAddress: null,
    });
  });

  it.each([
    ['an unknown writer', () => ({ username: 'ghost' })],
    ['a private profile', () => ({ username: 'hidden' })],
    ['a private novel', () => ({ target: 'novel', projectId: privateNovelId.toHexString() })],
    ['a novel of another writer', () => ({ target: 'novel', projectId: strangerNovelId.toHexString() })],
  ])('refuses %s', async (_case, overrides) => {
    expect(await submitReport(dependencies, input(overrides()), anonymous)).toEqual({
      error: 'This page can no longer be reported.',
    });
    expect(await collections(testDatabase.database).reports.countDocuments()).toBe(0);
  });

  it('turns a tampered target into a general error and keeps field errors for the form', async () => {
    expect(await submitReport(dependencies, input({ target: 'post' }), anonymous)).toEqual({
      error: 'This page can no longer be reported.',
    });
    expect(await submitReport(dependencies, input({ reason: 'other', details: '' }), anonymous)).toEqual({
      fieldErrors: { details: 'Tell us what is wrong.' },
    });
  });

  it('limits reports by address, by reporter and overall', async () => {
    const consume = vi.fn(async () => ({ allowed: true, retryAfterMs: 0 }));
    const limiter: RateLimiter = { consume, reset: vi.fn() };
    const reporter = { userId: reporterId.toHexString(), address: '198.51.100.1', userAgent: '' };

    await submitReport({ ...dependencies, limiter }, input(), reporter);

    expect(consume.mock.calls).toEqual([
      ['report:global', REPORT_RULES.global, NOW],
      ['report:address:198.51.100.1', REPORT_RULES.perAddress, NOW],
      [`report:user:${reporterId.toHexString()}`, REPORT_RULES.perReporter, NOW],
    ]);
  });

  it('tells how long to wait when the limit is reached', async () => {
    const limiter: RateLimiter = {
      consume: vi.fn(async () => ({ allowed: false, retryAfterMs: 125_000 })),
      reset: vi.fn(),
    };

    expect(await submitReport({ ...dependencies, limiter }, input(), anonymous)).toEqual({
      error: 'Too many reports sent from here. Try again in {minutes} minutes.',
      errorValues: { minutes: 3 },
    });
    expect(await collections(testDatabase.database).reports.countDocuments()).toBe(0);
  });

  it('lists reports newest first with the people and novel involved', async () => {
    const goneUser = new ObjectId();
    const goneNovel = new ObjectId();
    const base = {
      reason: 'spam' as const,
      details: '',
      reporterAddress: '203.0.113.7',
      reporterUserAgent: 'Firefox',
      status: 'open' as const,
      resolvedAt: null,
    };
    await reports.createReport({
      ...base,
      target: 'profile',
      targetUserId: writerId,
      targetProjectId: null,
      reporterUserId: null,
      createdAt: NOW,
    });
    await reports.createReport({
      ...base,
      target: 'novel',
      targetUserId: writerId,
      targetProjectId: publicNovelId,
      reporterUserId: reporterId,
      createdAt: LATER,
    });
    await reports.createReport({
      ...base,
      target: 'novel',
      targetUserId: goneUser,
      targetProjectId: goneNovel,
      reporterUserId: new ObjectId(),
      createdAt: new Date('2026-11-01T00:00:00.000Z'),
    });

    const { reports: listed } = await reports.listReports({ status: 'open' });

    expect(listed.map((report) => [report.targetUsername, report.novelTitle, report.reporterUsername])).toEqual([
      ['writer', 'Rio de Janeiro', 'reporter'],
      ['writer', null, null],
      [null, null, null],
    ]);
    expect(listed[0]).toMatchObject({
      target: 'novel',
      targetName: 'WRITER',
      reporterAddress: '203.0.113.7',
      reporterUserAgent: 'Firefox',
      status: 'open',
      createdAt: LATER,
      resolvedAt: null,
    });
    expect(listed[2].targetName).toBeNull();
    expect(await reports.listReports({ status: 'resolved' })).toEqual({ reports: [], total: 0, page: 1, pages: 1 });
  });

  it('lists the reports a page at a time and keeps the page inside the range', async () => {
    await collections(testDatabase.database).reports.deleteMany({});
    await collections(testDatabase.database).reports.insertMany(
      Array.from({ length: REPORTS_PAGE_SIZE + 3 }, (_unused, index) => ({
        target: 'profile' as const,
        targetUserId: writerId,
        targetProjectId: null,
        reason: 'spam' as const,
        details: `report ${index}`,
        reporterUserId: null,
        reporterAddress: null,
        reporterUserAgent: '',
        status: 'open' as const,
        createdAt: new Date(NOW.getTime() + index * 1000),
        resolvedAt: null,
      })),
    );

    const first = await reports.listReports({ status: 'open' });
    const second = await reports.listReports({ status: 'open', page: 2 });

    expect(first).toMatchObject({ total: REPORTS_PAGE_SIZE + 3, page: 1, pages: 2 });
    expect(first.reports).toHaveLength(REPORTS_PAGE_SIZE);
    expect(first.reports[0].details).toBe(`report ${REPORTS_PAGE_SIZE + 2}`);
    expect(second.reports.map((report) => report.details)).toEqual(['report 2', 'report 1', 'report 0']);
    expect((await reports.listReports({ status: 'open', page: 99 })).page).toBe(2);
    expect((await reports.listReports({ status: 'open', page: 0 })).page).toBe(1);
    expect((await reports.listReports({ status: 'open', page: Number.NaN })).page).toBe(1);
    await collections(testDatabase.database).reports.deleteMany({});
  });

  it('resolves and reopens a report', async () => {
    const id = await reports.createReport({
      target: 'profile',
      targetUserId: writerId,
      targetProjectId: null,
      reason: 'other',
      details: 'Odd.',
      reporterUserId: null,
      reporterAddress: null,
      reporterUserAgent: '',
      status: 'open',
      createdAt: NOW,
      resolvedAt: null,
    });

    expect(await reports.resolveReport(id, LATER)).toBe(true);
    expect((await reports.listReports({ status: 'resolved' })).reports).toMatchObject([{ id, resolvedAt: LATER }]);

    expect(await reports.reopenReport(id)).toBe(true);
    expect((await reports.listReports({ status: 'open' })).reports).toMatchObject([
      { id, status: 'open', resolvedAt: null },
    ]);
  });

  it('ignores unknown or malformed report ids', async () => {
    const missing = new ObjectId().toHexString();

    expect(await reports.resolveReport(missing, LATER)).toBe(false);
    expect(await reports.reopenReport(missing)).toBe(false);
    expect(await reports.resolveReport('nope', LATER)).toBe(false);
    expect(await reports.reopenReport('nope')).toBe(false);
  });

  it('knows only hand-marked users as admins', async () => {
    const admin = await collections(testDatabase.database).users.findOne({ username: 'admin' });

    expect(await reports.isAdmin(String(admin?._id.toHexString()))).toBe(true);
    expect(await reports.isAdmin(reporterId.toHexString())).toBe(false);
    expect(await reports.isAdmin(writerId.toHexString())).toBe(false);
    expect(await reports.isAdmin('nope')).toBe(false);
  });
});
