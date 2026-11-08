'use server';

import { revalidatePath } from 'next/cache';
import { notFound } from 'next/navigation';
import { createRateLimiter } from '@/lib/auth/rate-limit';
import { getDatabase } from '@/lib/db/client';
import { formValues, type FormState } from '@/lib/form';
import { REPORT_FIELDS, createReportRepository, submitReport, type ReportRepository } from '@/lib/moderation/reports';
import { clientInfo, getCurrentUser } from '@/server/session';

const ADMIN_REPORTS_PATH = '/write/admin/reports';

/** Anyone can report a public page, signed in or not. */
export async function reportAction(_previous: FormState, formData: FormData): Promise<FormState> {
  const database = await getDatabase();
  const user = await getCurrentUser();
  const { address, userAgent } = await clientInfo();

  return submitReport(
    { reports: createReportRepository(database), limiter: createRateLimiter(database), now: new Date() },
    formValues(formData, REPORT_FIELDS),
    { userId: user?.id ?? null, address, userAgent },
  );
}

/** The report repository, only for a signed-in admin; anyone else gets a 404. */
const adminReports = async (): Promise<ReportRepository> => {
  const user = await getCurrentUser();
  const reports = createReportRepository(await getDatabase());

  if (!user || !(await reports.isAdmin(user.id))) {
    notFound();
  }

  return reports;
};

export async function resolveReportAction(reportId: string): Promise<void> {
  const reports = await adminReports();
  await reports.resolveReport(reportId, new Date());
  revalidatePath(ADMIN_REPORTS_PATH);
}

export async function reopenReportAction(reportId: string): Promise<void> {
  const reports = await adminReports();
  await reports.reopenReport(reportId);
  revalidatePath(ADMIN_REPORTS_PATH);
}
