import type { ReportReason } from '@/lib/db/collections';
import { translate } from '@/lib/i18n/translate';
import { REPORT_REASON_LABELS } from './labels';

const RESEND_URL = 'https://api.resend.com/emails';
// Resend's shared sender works without a domain of your own, for e-mails to the account's own address.
const SENDER = 'Open Wrimo <onboarding@resend.dev>';

export type AlertSettings = { apiKey?: string; to?: string; appUrl: string };

/**
 * Tells the admin by e-mail that a report came in. On purpose it carries no personal data, only the
 * reason and a link to the moderation page, where the details stay. Never throws: a failed e-mail
 * must not lose the report.
 */
export const sendReportAlert = async (
  { apiKey, to, appUrl }: AlertSettings,
  reason: ReportReason,
  send: typeof fetch = fetch,
): Promise<boolean> => {
  if (!apiKey || !to) {
    return false;
  }

  const label = translate('pt-BR', REPORT_REASON_LABELS[reason]);

  try {
    const response = await send(RESEND_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: SENDER,
        to: [to],
        subject: `Nova denúncia no Open Wrimo: ${label}`,
        text: `Chegou uma nova denúncia.\n\nMotivo: ${label}\n\nVeja os detalhes no painel: ${new URL('/write/admin/reports', appUrl).toString()}\n`,
      }),
    });

    return response.ok;
  } catch {
    return false;
  }
};
