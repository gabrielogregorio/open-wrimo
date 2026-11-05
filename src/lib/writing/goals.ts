import type { EntryView, GoalView } from './repository';
import type { GoalFilter, GoalPeriod } from './schema';
import { goalStats, type GoalStats } from './stats';

export const entriesForGoal = (goal: GoalView, entries: EntryView[]): EntryView[] =>
  entries.filter(
    (entry) =>
      entry.projectId === goal.projectId &&
      entry.unit === goal.unit &&
      entry.date >= goal.startDate &&
      entry.date <= goal.endDate,
  );

export const periodWindow = (period: GoalPeriod, today: string): { startDate: string; endDate: string } => {
  const [year, month] = today.split('-').map(Number);

  if (period === 'daily') {
    return { startDate: today, endDate: today };
  }

  if (period === 'monthly') {
    return {
      startDate: `${today.slice(0, 7)}-01`,
      endDate: new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10),
    };
  }

  return { startDate: `${year}-01-01`, endDate: `${year}-12-31` };
};

export const currentSpan = (goal: GoalView, today: string): GoalView =>
  goal.period ? { ...goal, ...periodWindow(goal.period, today) } : goal;

export type GoalWithStats = GoalView & { stats: GoalStats };

export const withStats = (goals: GoalView[], entries: EntryView[], today: string): GoalWithStats[] =>
  goals.map((goal) => {
    const span = currentSpan(goal, today);

    return { ...goal, stats: goalStats(span, entriesForGoal(span, entries), today) };
  });

export const filterGoals = (goals: GoalWithStats[], filter: GoalFilter): GoalWithStats[] =>
  filter === 'all' ? goals : goals.filter((goal) => goal.stats.state === filter);

export const currentGoal = (goals: GoalWithStats[]): GoalWithStats | null =>
  goals.find((goal) => goal.stats.state === 'active') ?? goals[0] ?? null;
