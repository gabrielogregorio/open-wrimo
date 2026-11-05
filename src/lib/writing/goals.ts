import type { EntryView, GoalView } from './repository';
import type { GoalFilter } from './schema';
import { goalStats, type GoalStats } from './stats';

export const entriesForGoal = (goal: GoalView, entries: EntryView[]): EntryView[] =>
  entries.filter(
    (entry) =>
      entry.projectId === goal.projectId &&
      entry.unit === goal.unit &&
      entry.date >= goal.startDate &&
      entry.date <= goal.endDate,
  );

export type GoalWithStats = GoalView & { stats: GoalStats };

export const withStats = (goals: GoalView[], entries: EntryView[], today: string): GoalWithStats[] =>
  goals.map((goal) => ({ ...goal, stats: goalStats(goal, entriesForGoal(goal, entries), today) }));

export const filterGoals = (goals: GoalWithStats[], filter: GoalFilter): GoalWithStats[] =>
  filter === 'all' ? goals : goals.filter((goal) => goal.stats.state === filter);

export const currentGoal = (goals: GoalWithStats[]): GoalWithStats | null =>
  goals.find((goal) => goal.stats.state === 'active') ?? goals[0] ?? null;
