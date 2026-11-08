'use server';

import { revalidatePath } from 'next/cache';
import { notFound, redirect } from 'next/navigation';
import { purgeAccount } from '@/lib/account/account';
import { createRateLimiter } from '@/lib/auth/rate-limit';
import { getDatabase } from '@/lib/db/client';
import { getEnvironment } from '@/lib/env';
import { formValues, type FormState } from '@/lib/form';
import { sendReportAlert } from '@/lib/moderation/alert';
import { REPORT_FIELDS, createReportRepository, submitReport, type ReportRepository } from '@/lib/moderation/reports';
import { clientInfo, getCurrentUser, getImageStorage } from '@/server/session';

const ADMIN_REPORTS_PATH = '/write/admin/reports';

/** Anyone can report a public page, signed in or not. */
export async function reportAction(_previous: FormState, formData: FormData): Promise<FormState> {
  const database = await getDatabase();
  const user = await getCurrentUser();
  const { address, userAgent } = await clientInfo();

  const { RESEND_API_KEY, REPORT_ALERT_EMAIL, APP_URL } = getEnvironment();

  return submitReport(
    {
      reports: createReportRepository(database),
      limiter: createRateLimiter(database),
      now: new Date(),
      alert: (reason) => sendReportAlert({ apiKey: RESEND_API_KEY, to: REPORT_ALERT_EMAIL, appUrl: APP_URL }, reason),
    },
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

const ADMIN_DELETIONS_PATH = '/write/admin/exclusoes';

/** Deletes one account for good, by hand, after the grace period; only for an admin who ticked the box. */
export async function purgeAccountAction(userId: string, formData: FormData): Promise<void> {
  await adminReports();

  if (formData.get('confirm') !== 'on') {
    redirect(`${ADMIN_DELETIONS_PATH}?confirmar=${userId}`);
  }

  await purgeAccount(await getDatabase(), getImageStorage(), userId, new Date());
  revalidatePath(ADMIN_DELETIONS_PATH);
  redirect(ADMIN_DELETIONS_PATH);
}
