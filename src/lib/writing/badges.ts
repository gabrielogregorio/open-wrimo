import { entriesForGoal } from './goals';
import type { EntryView, GoalView } from './repository';
import { goalStats, longestStreak, sumByDate } from './stats';

export type BadgeGlyph =
  'quill' | 'flame' | 'stack' | 'sun-day' | 'flag' | 'summit' | 'clock' | 'sun' | 'moon' | 'heart';

export type Badge = { id: string; label: string; description: string; glyph: BadgeGlyph; mark?: string };

export const NANO_DAILY_PAR = 1667;
const EARLY_HOURS = { from: 5, to: 9 };
const LATE_HOURS = { from: 22, to: 4 };

const streakBadge = (days: number): Badge => ({
  id: `streak-${days}`,
  label: '{count}-day streak',
  description: 'Wrote on {count} days in a row.',
  glyph: 'flame',
  mark: String(days),
});

const wordsBadge = (words: number, mark: string): Badge => ({
  id: `words-${words}`,
  label: '{count} words',
  description: 'The project passed {count} words.',
  glyph: 'stack',
  mark,
});

export const STREAK_DAYS = [2, 3, 7, 14, 30] as const;
export const WORD_MILESTONES = [
  [1000, '1k'],
  [5000, '5k'],
  [10000, '10k'],
  [25000, '25k'],
  [50000, '50k'],
  [100000, '100k'],
] as const;

export const WRITING_BADGES: Badge[] = [
  { id: 'first-update', label: 'First words', description: 'Logged the first progress.', glyph: 'quill' },
  ...STREAK_DAYS.map(streakBadge),
  ...WORD_MILESTONES.map(([words, mark]) => wordsBadge(words, mark)),
  {
    id: 'par-day',
    label: 'Par day',
    description: 'Wrote 1,667 words or more in a single day.',
    glyph: 'sun-day',
    mark: '1,667',
  },
  { id: 'halfway', label: 'Halfway there', description: 'Reached half of a goal.', glyph: 'flag' },
  { id: 'goal-met', label: 'Goal met', description: 'Reached the target of a goal.', glyph: 'summit' },
  {
    id: 'par-every-day',
    label: 'Never behind',
    description: 'Stayed on or above par every day of a goal.',
    glyph: 'summit',
    mark: '★',
  },
  { id: 'sprinter', label: 'Sprinter', description: 'Logged words from a timed sprint.', glyph: 'clock' },
  { id: 'early-bird', label: 'Early bird', description: 'Logged words between 5 and 9 in the morning.', glyph: 'sun' },
  {
    id: 'night-owl',
    label: 'Night owl',
    description: 'Logged words between 10 at night and 4 in the morning.',
    glyph: 'moon',
  },
];

export const PERSONAL_BADGES: Badge[] = [
  { id: 'planned-plot', label: 'Planned the plot', description: 'The outline is done.', glyph: 'flag' },
  { id: 'met-characters', label: 'Met my characters', description: 'They feel like people now.', glyph: 'heart' },
  { id: 'finished-chapter', label: 'Finished a chapter', description: 'One more chapter closed.', glyph: 'stack' },
  { id: 'made-me-cry', label: 'Made myself cry', description: 'A scene hit hard.', glyph: 'heart' },
  { id: 'killed-character', label: 'Killed a character', description: 'Someone did not make it.', glyph: 'quill' },
  { id: 'wrote-outside', label: 'Wrote away from home', description: 'A café, a park, a bus.', glyph: 'sun' },
  { id: 'no-editing', label: 'Kept going', description: 'Wrote a whole session without editing.', glyph: 'flame' },
  { id: 'shared-excerpt', label: 'Shared an excerpt', description: 'Someone read a piece of it.', glyph: 'quill' },
];

const PERSONAL_IDS = new Set(PERSONAL_BADGES.map((badge) => badge.id));

export const onlyPersonalBadges = (ids: string[]): string[] => [...new Set(ids)].filter((id) => PERSONAL_IDS.has(id));

const inHours = (hour: number, { from, to }: { from: number; to: number }): boolean =>
  hour >= 0 && (from < to ? hour >= from && hour < to : hour >= from || hour < to);

const stayedOnPar = (goal: GoalView, entries: EntryView[], today: string): boolean => {
  const stats = goalStats(goal, entries, today);
  const lastDay = stats.reachedOn ?? goal.endDate;
  const days = stats.daily.filter((point) => point.date <= lastDay);

  return (stats.reached || stats.state === 'ended') && days.every((point) => point.cumulative >= point.par);
};

export const earnedWritingBadges = (
  { goals, entries }: { goals: GoalView[]; entries: EntryView[] },
  today: string,
): Set<string> => {
  const earned = new Set<string>();
  const words = entries.filter((entry) => entry.unit === 'words');
  const totalWords = words.reduce((sum, entry) => sum + entry.count, 0);
  const streak = longestStreak(entries);

  if (entries.length > 0) {
    earned.add('first-update');
  }

  STREAK_DAYS.filter((days) => streak >= days).forEach((days) => earned.add(`streak-${days}`));
  WORD_MILESTONES.filter(([milestone]) => totalWords >= milestone).forEach(([milestone]) =>
    earned.add(`words-${milestone}`),
  );

  if ([...sumByDate(words).values()].some((count) => count >= NANO_DAILY_PAR)) {
    earned.add('par-day');
  }

  for (const goal of goals) {
    const counted = entriesForGoal(goal, entries);
    const stats = goalStats(goal, counted, today);

    if (stats.percent >= 50) {
      earned.add('halfway');
    }

    if (stats.reached) {
      earned.add('goal-met');
    }

    if (stayedOnPar(goal, counted, today)) {
      earned.add('par-every-day');
    }
  }

  if (entries.some((entry) => entry.source === 'sprint')) {
    earned.add('sprinter');
  }

  if (entries.some((entry) => inHours(entry.hour, EARLY_HOURS))) {
    earned.add('early-bird');
  }

  if (entries.some((entry) => inHours(entry.hour, LATE_HOURS))) {
    earned.add('night-owl');
  }

  return earned;
};

export const laurels = (goals: GoalView[], entries: EntryView[], today: string): number =>
  goals.filter((goal) => goalStats(goal, entriesForGoal(goal, entries), today).reached).length;
