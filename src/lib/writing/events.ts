import type { GoalInput } from './schema';

export const EVENTS = [
  { id: 'november', name: 'November novel {year}', month: 11, target: 50000 },
  { id: 'april-camp', name: 'April camp {year}', month: 4, target: 30000 },
  { id: 'july-camp', name: 'July camp {year}', month: 7, target: 30000 },
] as const;

export type EventId = (typeof EVENTS)[number]['id'];
export const EVENT_IDS = EVENTS.map((event) => event.id) as [EventId, ...EventId[]];

const pad = (value: number): string => String(value).padStart(2, '0');

const monthSpan = (year: number, month: number): { startDate: string; endDate: string } => ({
  startDate: `${year}-${pad(month)}-01`,
  endDate: new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10),
});

export const eventGoal = (
  eventId: EventId,
  today: string,
  translate: (text: string, values: Record<string, string | number>) => string,
): GoalInput => {
  const event = EVENTS.find((candidate) => candidate.id === eventId)!;
  const year = Number(today.slice(0, 4));
  const thisYear = monthSpan(year, event.month);
  const span = thisYear.endDate >= today ? thisYear : monthSpan(year + 1, event.month);

  return {
    name: translate(event.name, { year: span.startDate.slice(0, 4) }),
    unit: 'words',
    target: event.target,
    ...span,
    period: null,
  };
};
