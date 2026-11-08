import type { ReportReason } from '@/lib/db/collections';

/** Safe to import from client components: no database code here. */
export const REPORT_REASON_LABELS: Record<ReportReason, string> = {
  'child-abuse': 'Sexual content involving children',
  'non-consensual-intimate': 'Intimate images shared without consent',
  'hate-or-violence': 'Hate speech, threats or violence',
  copyright: 'Copyright infringement',
  spam: 'Spam or scam',
  other: 'Something else',
};

export const REPORT_DETAILS_MAX_LENGTH = 2000;

const MODERATION_TIME_ZONE = 'America/Sao_Paulo';

const reportTimeFormat = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
  timeStyle: 'short',
  timeZone: MODERATION_TIME_ZONE,
});

/** Date and time in Brasília, the way the moderation team reads it. */
export const formatReportTime = (date: Date): string => reportTimeFormat.format(date);
