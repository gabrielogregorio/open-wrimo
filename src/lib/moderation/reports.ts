import { ObjectId, type Db } from 'mongodb';
import { z } from 'zod';
import { minutesUntil, type RateLimiter, type RateRule } from '@/lib/auth/rate-limit';
import {
  REPORT_REASONS,
  REPORT_TARGETS,
  collections,
  type ReportDocument,
  type ReportReason,
  type ReportTarget,
} from '@/lib/db/collections';
import { fieldErrorsFrom, type FormState } from '@/lib/form';
import { REPORT_DETAILS_MAX_LENGTH } from './labels';

const HOUR_IN_MS = 60 * 60_000;
export const REPORTS_PAGE_SIZE = 25;

export const REPORT_RULES = {
  perAddress: { limit: 5, windowMs: HOUR_IN_MS },
  perReporter: { limit: 5, windowMs: HOUR_IN_MS },
  global: { limit: 200, windowMs: HOUR_IN_MS },
} satisfies Record<string, RateRule>;

export const REPORT_FIELDS = ['target', 'username', 'projectId', 'reason', 'details'] as const;

const TARGET_GONE_ERROR = 'This page can no longer be reported.';
const TOO_MANY_REPORTS_ERROR = 'Too many reports sent from here. Try again in {minutes} minutes.';

export const reportInputSchema = z
  .object({
    target: z.enum(REPORT_TARGETS, { error: 'Choose what you are reporting.' }),
    username: z.string().trim().toLowerCase().min(1, { error: 'Choose who you are reporting.' }).max(60),
    projectId: z.string().trim().max(24),
    reason: z.enum(REPORT_REASONS, { error: 'Choose a reason.' }),
    details: z.string().trim().max(REPORT_DETAILS_MAX_LENGTH, { error: 'Keep the details under 2000 characters.' }),
  })
  .refine((input) => input.reason !== 'other' || input.details.length > 0, {
    error: 'Tell us what is wrong.',
    path: ['details'],
  })
  .refine((input) => input.target === 'profile' || ObjectId.isValid(input.projectId), {
    error: 'Choose the novel you are reporting.',
    path: ['projectId'],
  });

export type ReportInput = z.infer<typeof reportInputSchema>;

export type ReportStatus = ReportDocument['status'];

export type ReportView = {
  id: string;
  target: ReportTarget;
  reason: ReportReason;
  details: string;
  status: ReportStatus;
  createdAt: Date;
  resolvedAt: Date | null;
  targetUsername: string | null;
  targetName: string | null;
  novelTitle: string | null;
  reporterUsername: string | null;
  reporterAddress: string | null;
  reporterUserAgent: string;
};

export type ReportPage = { reports: ReportView[]; total: number; page: number; pages: number };

export type PublicTarget = { targetUserId: ObjectId; targetProjectId: ObjectId | null };

const objectIdOrNull = (id: string): ObjectId | null => (ObjectId.isValid(id) ? new ObjectId(id) : null);

export const createReportRepository = (database: Db) => {
  const { reports, users, profiles, projects } = collections(database);

  return {
    async createReport(report: ReportDocument): Promise<string> {
      const { insertedId } = await reports.insertOne(report);

      return insertedId.toHexString();
    },

    /** Newest first, a page at a time; only the moderation page reads this, never the reported writer. */
    async listReports({ status, page = 1 }: { status: ReportStatus; page?: number }): Promise<ReportPage> {
      const total = await reports.countDocuments({ status });
      const pages = Math.max(1, Math.ceil(total / REPORTS_PAGE_SIZE));
      const current = Math.min(Math.max(1, Math.floor(page) || 1), pages);
      const found = await reports
        .find({ status })
        .sort({ createdAt: -1, _id: -1 })
        .skip((current - 1) * REPORTS_PAGE_SIZE)
        .limit(REPORTS_PAGE_SIZE)
        .toArray();
      const userIds = found.flatMap((report) =>
        report.reporterUserId ? [report.targetUserId, report.reporterUserId] : [report.targetUserId],
      );
      const projectIds = found.flatMap((report) => (report.targetProjectId ? [report.targetProjectId] : []));
      const [foundUsers, foundProjects] = await Promise.all([
        users.find({ _id: { $in: userIds } }, { projection: { username: 1, name: 1 } }).toArray(),
        projects.find({ _id: { $in: projectIds } }, { projection: { title: 1 } }).toArray(),
      ]);
      const usersById = new Map(foundUsers.map((user) => [user._id.toHexString(), user]));
      const titlesById = new Map(foundProjects.map((project) => [project._id.toHexString(), project.title]));

      const views = found.map((report) => {
        const target = usersById.get(report.targetUserId.toHexString());
        const reporter = report.reporterUserId ? usersById.get(report.reporterUserId.toHexString()) : undefined;
        const novelTitle = report.targetProjectId ? titlesById.get(report.targetProjectId.toHexString()) : undefined;

        return {
          id: report._id.toHexString(),
          target: report.target,
          reason: report.reason,
          details: report.details,
          status: report.status,
          createdAt: report.createdAt,
          resolvedAt: report.resolvedAt,
          targetUsername: target?.username ?? null,
          targetName: target?.name ?? null,
          novelTitle: novelTitle ?? null,
          reporterUsername: reporter?.username ?? null,
          reporterAddress: report.reporterAddress,
          reporterUserAgent: report.reporterUserAgent,
        };
      });

      return { reports: views, total, page: current, pages };
    },

    async resolveReport(id: string, now: Date): Promise<boolean> {
      const reportId = objectIdOrNull(id);

      if (!reportId) {
        return false;
      }

      const result = await reports.updateOne({ _id: reportId }, { $set: { status: 'resolved', resolvedAt: now } });

      return result.matchedCount > 0;
    },

    async reopenReport(id: string): Promise<boolean> {
      const reportId = objectIdOrNull(id);

      if (!reportId) {
        return false;
      }

      const result = await reports.updateOne({ _id: reportId }, { $set: { status: 'open', resolvedAt: null } });

      return result.matchedCount > 0;
    },

    /** The writer and novel behind a report, only while they are public. */
    async findPublicTarget(
      input: Pick<ReportInput, 'target' | 'username' | 'projectId'>,
    ): Promise<PublicTarget | null> {
      const user = await users.findOne({ username: input.username }, { projection: { _id: 1 } });

      if (!user) {
        return null;
      }

      const profile = await profiles.findOne({ userId: user._id, isPublic: true }, { projection: { _id: 1 } });

      if (!profile) {
        return null;
      }

      if (input.target === 'profile') {
        return { targetUserId: user._id, targetProjectId: null };
      }

      const projectId = new ObjectId(input.projectId);
      const project = await projects.findOne(
        { _id: projectId, userId: user._id, isPublic: true },
        { projection: { _id: 1 } },
      );

      return project ? { targetUserId: user._id, targetProjectId: projectId } : null;
    },

    /** Admins are marked by hand in the database; no code path sets the flag. */
    async isAdmin(userId: string): Promise<boolean> {
      const id = objectIdOrNull(userId);

      if (!id) {
        return false;
      }

      return (await users.countDocuments({ _id: id, isAdmin: true }, { limit: 1 })) > 0;
    },
  };
};

export type ReportRepository = ReturnType<typeof createReportRepository>;

export type ReportDependencies = {
  reports: ReportRepository;
  limiter: RateLimiter;
  now: Date;
};

export type Reporter = { userId: string | null; address: string | null; userAgent: string };

const rateKeys = (reporter: Reporter): [string, RateRule][] => {
  const keys: [string, RateRule][] = [['report:global', REPORT_RULES.global]];

  if (reporter.address) {
    keys.push([`report:address:${reporter.address}`, REPORT_RULES.perAddress]);
  }

  if (reporter.userId) {
    keys.push([`report:user:${reporter.userId}`, REPORT_RULES.perReporter]);
  }

  return keys;
};

export const submitReport = async (
  { reports, limiter, now }: ReportDependencies,
  input: Record<string, unknown>,
  reporter: Reporter,
): Promise<FormState> => {
  const parsed = reportInputSchema.safeParse(input);

  if (!parsed.success) {
    const fieldErrors = fieldErrorsFrom(parsed.error);
    const targetIsBroken = Boolean(fieldErrors.target ?? fieldErrors.username ?? fieldErrors.projectId);

    return targetIsBroken ? { error: TARGET_GONE_ERROR } : { fieldErrors };
  }

  for (const [key, rule] of rateKeys(reporter)) {
    const decision = await limiter.consume(key, rule, now);

    if (!decision.allowed) {
      return { error: TOO_MANY_REPORTS_ERROR, errorValues: { minutes: minutesUntil(decision.retryAfterMs) } };
    }
  }

  const target = await reports.findPublicTarget(parsed.data);

  if (!target) {
    return { error: TARGET_GONE_ERROR };
  }

  await reports.createReport({
    target: parsed.data.target,
    ...target,
    reason: parsed.data.reason,
    details: parsed.data.details,
    reporterUserId: reporter.userId ? new ObjectId(reporter.userId) : null,
    reporterAddress: reporter.address,
    reporterUserAgent: reporter.userAgent,
    status: 'open',
    createdAt: now,
    resolvedAt: null,
  });

  return { saved: true };
};
