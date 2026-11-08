// How many words a day reach a target by a date, and where the recent pace leads.
import { addDays, daysBetween } from '@/lib/writing/dates';

export type DayCount = { date: string; count: number };

export type GoalPlan = {
  remaining: number;
  daysLeft: number;
  perDay: number;
  pace: number;
  projectedDate: string | null;
  onTrack: boolean;
};

export const PACE_DAYS = 7;

// Average words a day over the last seven days, today included.
export const recentPace = (wordsByDay: DayCount[], today: string): number => {
  const from = addDays(today, -(PACE_DAYS - 1));
  const total = wordsByDay
    .filter((day) => day.date >= from && day.date <= today)
    .reduce((sum, day) => sum + day.count, 0);

  return total / PACE_DAYS;
};

export const planGoal = (input: {
  today: string;
  target: number;
  current: number;
  endDate: string;
  wordsByDay: DayCount[];
}): GoalPlan => {
  const remaining = Math.max(0, input.target - input.current);
  const daysLeft = Math.max(0, daysBetween(input.today, input.endDate) + 1);
  const pace = recentPace(input.wordsByDay, input.today);

  if (remaining === 0) {
    return { remaining, daysLeft, perDay: 0, pace, projectedDate: input.today, onTrack: true };
  }

  const perDay = daysLeft > 0 ? Math.ceil(remaining / daysLeft) : remaining;
  const projectedDate = pace > 0 ? addDays(input.today, Math.ceil(remaining / pace) - 1) : null;

  return {
    remaining,
    daysLeft,
    perDay,
    pace,
    projectedDate,
    onTrack: projectedDate !== null && daysLeft > 0 && projectedDate <= input.endDate,
  };
};
