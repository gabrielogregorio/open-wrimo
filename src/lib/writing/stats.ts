import { addDays, datesFrom, daysBetween } from './dates';

export type DayCount = { date: string; count: number };
export type GoalSpan = { target: number; startDate: string; endDate: string };
export type GoalState = 'upcoming' | 'active' | 'ended';
export type DailyPoint = { date: string; count: number; cumulative: number; par: number };

export type GoalStats = {
  state: GoalState;
  total: number;
  percent: number;
  remaining: number;
  reached: boolean;
  reachedOn: string | null;
  totalDays: number;
  daysElapsed: number;
  daysLeft: number;
  writtenToday: number;
  neededToday: number;
  dailyPar: number;
  parToday: number;
  averagePerDay: number;
  projectedFinish: string | null;
  bestDay: DayCount | null;
  daily: DailyPoint[];
};

export const sumByDate = (entries: DayCount[]): Map<string, number> => {
  const totals = new Map<string, number>();

  for (const entry of entries) {
    totals.set(entry.date, (totals.get(entry.date) ?? 0) + entry.count);
  }

  return totals;
};

const goalState = ({ startDate, endDate }: GoalSpan, today: string): GoalState => {
  if (today < startDate) {
    return 'upcoming';
  }

  return today > endDate ? 'ended' : 'active';
};

export const goalStats = (goal: GoalSpan, entries: DayCount[], today: string): GoalStats => {
  const state = goalState(goal, today);
  const totals = sumByDate(entries);
  const totalDays = daysBetween(goal.startDate, goal.endDate) + 1;
  const lastCountedDay = state === 'ended' ? goal.endDate : today;
  const daysElapsed = state === 'upcoming' ? 0 : daysBetween(goal.startDate, lastCountedDay) + 1;
  let cumulative = 0;
  let reachedOn: string | null = null;
  const daily = datesFrom(goal.startDate, goal.endDate).map((date, index) => {
    const count = totals.get(date) ?? 0;
    cumulative += count;

    if (!reachedOn && cumulative >= goal.target) {
      reachedOn = date;
    }

    return { date, count, cumulative, par: Math.round((goal.target * (index + 1)) / totalDays) };
  });
  const total = [...totals.values()].reduce((sum, count) => sum + count, 0);
  const remaining = Math.max(0, goal.target - total);
  const writtenToday = state === 'active' ? (totals.get(today) ?? 0) : 0;
  const daysLeft = { upcoming: totalDays, active: totalDays - daysElapsed + 1, ended: 0 }[state];
  const remainingAtDawn = Math.max(0, goal.target - (total - writtenToday));
  const averagePerDay = daysElapsed > 0 ? Math.round(total / daysElapsed) : 0;
  const best = [...totals.entries()].reduce<DayCount | null>(
    (current, [date, count]) => (count > 0 && (!current || count > current.count) ? { date, count } : current),
    null,
  );

  return {
    state,
    total,
    percent: Math.min(100, Math.floor((total / goal.target) * 100)),
    remaining,
    reached: total >= goal.target,
    reachedOn: total >= goal.target ? (reachedOn ?? lastCountedDay) : null,
    totalDays,
    daysElapsed,
    daysLeft,
    writtenToday,
    neededToday: state === 'active' ? Math.ceil(remainingAtDawn / daysLeft) : 0,
    dailyPar: Math.ceil(goal.target / totalDays),
    parToday: daysElapsed > 0 ? daily[daysElapsed - 1].par : 0,
    averagePerDay,
    projectedFinish:
      remaining > 0 && averagePerDay > 0 && state !== 'ended'
        ? addDays(today, Math.ceil(remaining / averagePerDay))
        : null,
    bestDay: best,
    daily,
  };
};

export const writingStreak = (entries: DayCount[], today: string): number => {
  const totals = sumByDate(entries);
  const wrote = (date: string): boolean => (totals.get(date) ?? 0) > 0;
  let day = wrote(today) ? today : addDays(today, -1);
  let streak = 0;

  while (wrote(day)) {
    streak += 1;
    day = addDays(day, -1);
  }

  return streak;
};

export const longestStreak = (entries: DayCount[]): number => {
  const days = [...sumByDate(entries).entries()]
    .filter(([, count]) => count > 0)
    .map(([date]) => date)
    .sort();
  let longest = 0;
  let current = 0;

  days.forEach((date, index) => {
    current = index > 0 && daysBetween(days[index - 1], date) === 1 ? current + 1 : 1;
    longest = Math.max(longest, current);
  });

  return longest;
};
