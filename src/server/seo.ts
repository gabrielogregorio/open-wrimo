import { getEnvironment } from '@/lib/env';

export const SITE_NAME = 'Open Wrimo';
export const SITE_DESCRIPTION = 'Write your novel, track every word and meet your goals.';

export const siteUrl = (): URL => new URL(getEnvironment().APP_URL);

export const absoluteUrl = (path: string): string => new URL(path, siteUrl()).toString();

export const jsonLd = (data: Record<string, unknown>): { __html: string } => ({
  __html: JSON.stringify(data).replace(/</g, '\\u003c'),
});
