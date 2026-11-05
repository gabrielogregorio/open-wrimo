import type { Locale } from './locales';

export const formatNumber = (locale: Locale, value: number): string => new Intl.NumberFormat(locale).format(value);

const atNoon = (isoDate: string): Date => new Date(`${isoDate}T12:00:00.000Z`);

export const formatDay = (locale: Locale, isoDate: string): string =>
  new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(
    atNoon(isoDate),
  );

export const formatShortDay = (locale: Locale, isoDate: string): string =>
  new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(atNoon(isoDate));

export const formatMonth = (locale: Locale, month: string): string =>
  new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(atNoon(`${month}-01`));
