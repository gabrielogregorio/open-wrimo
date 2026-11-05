const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 24 * 60 * 60 * 1000;

export const DEFAULT_TIME_ZONE = 'UTC';
export const TIME_ZONE_COOKIE = 'folio-time-zone';

export const isTimeZone = (value: unknown): value is string => {
  if (typeof value !== 'string' || value.length === 0 || value.length > 64) {
    return false;
  }

  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value });

    return true;
  } catch {
    return false;
  }
};

export const resolveTimeZone = (value: string | undefined): string => (isTimeZone(value) ? value : DEFAULT_TIME_ZONE);

export const isIsoDate = (value: string): boolean => {
  if (!ISO_DATE.test(value)) {
    return false;
  }

  const parsed = new Date(`${value}T00:00:00.000Z`);

  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().startsWith(value);
};

export const localDate = (instant: Date, timeZone: string): string =>
  new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(instant);

export const localHour = (instant: Date, timeZone: string): number =>
  Number(new Intl.DateTimeFormat('en-US', { timeZone, hour: 'numeric', hourCycle: 'h23' }).format(instant));

const dayNumber = (isoDate: string): number => Date.parse(`${isoDate}T00:00:00.000Z`) / DAY_MS;

export const daysBetween = (from: string, to: string): number => dayNumber(to) - dayNumber(from);

export const addDays = (isoDate: string, days: number): string =>
  new Date((dayNumber(isoDate) + days) * DAY_MS).toISOString().slice(0, 10);

export const datesFrom = (from: string, to: string): string[] =>
  Array.from({ length: Math.max(0, daysBetween(from, to) + 1) }, (_unused, index) => addDays(from, index));
