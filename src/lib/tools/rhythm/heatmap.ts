// A year of writing as a grid of weeks (columns, Sunday first) and days (rows), like a contribution graph.
import { addDays, daysBetween } from '@/lib/writing/dates';
import type { DayCount } from './goal';

export type HeatCell = { date: string; count: number; level: number } | null;

export type YearHeat = {
  weeks: HeatCell[][];
  months: { month: number; week: number }[];
  total: number;
  daysWritten: number;
  longestStreak: number;
  max: number;
};

export const LEVELS = 5;

const weekday = (isoDate: string): number => new Date(`${isoDate}T00:00:00.000Z`).getUTCDay();

export const levelOf = (count: number, max: number): number => {
  if (count <= 0 || max <= 0) {
    return 0;
  }

  return Math.min(LEVELS - 1, Math.ceil((count / max) * (LEVELS - 1)));
};

export const yearHeat = (year: number, wordsByDay: DayCount[]): YearHeat => {
  const first = `${String(year).padStart(4, '0')}-01-01`;
  const last = `${String(year).padStart(4, '0')}-12-31`;
  const counts = new Map<string, number>();

  for (const day of wordsByDay) {
    if (day.date >= first && day.date <= last && day.count > 0) {
      counts.set(day.date, (counts.get(day.date) ?? 0) + day.count);
    }
  }

  const max = Math.max(0, ...counts.values());
  const offset = weekday(first);
  const length = daysBetween(first, last) + 1;
  const weekCount = Math.ceil((offset + length) / 7);
  const weeks: HeatCell[][] = Array.from({ length: weekCount }, (_week, week) =>
    Array.from({ length: 7 }, (_day, day): HeatCell => {
      const index = week * 7 + day - offset;

      if (index < 0 || index >= length) {
        return null;
      }

      const date = addDays(first, index);
      const count = counts.get(date) ?? 0;

      return { date, count, level: levelOf(count, max) };
    }),
  );
  const months = Array.from({ length: 12 }, (_unused, month) => {
    const date = `${first.slice(0, 5)}${String(month + 1).padStart(2, '0')}-01`;

    return { month, week: Math.floor((offset + daysBetween(first, date)) / 7) };
  });
  let longestStreak = 0;
  let streak = 0;

  for (let index = 0; index < length; index += 1) {
    streak = counts.has(addDays(first, index)) ? streak + 1 : 0;
    longestStreak = Math.max(longestStreak, streak);
  }

  return {
    weeks,
    months,
    total: [...counts.values()].reduce((sum, count) => sum + count, 0),
    daysWritten: counts.size,
    longestStreak,
    max,
  };
};
