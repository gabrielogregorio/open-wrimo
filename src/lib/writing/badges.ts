import { entriesForGoal } from './goals';
import type { EntryView, GoalView } from './repository';
import { goalStats, longestStreak, sumByDate } from './stats';

export type BadgeGlyph =
  | 'quill'
  | 'flame'
  | 'stack'
  | 'sun-day'
  | 'flag'
  | 'summit'
  | 'clock'
  | 'sun'
  | 'moon'
  | 'heart'
  | 'disk'
  | 'pulse'
  | 'runner'
  | 'tear'
  | 'pants'
  | 'clipboard'
  | 'tent'
  | 'pencil'
  | 'shades'
  | 'typewriter'
  | 'music'
  | 'megaphone'
  | 'letter'
  | 'cup'
  | 'book'
  | 'target'
  | 'calendar'
  | 'image'
  | 'skull'
  | 'map';

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
  {
    id: 'back-it-up',
    label: 'Back it up',
    description: 'You backed up your work. Then again. And again.',
    glyph: 'disk',
  },
  {
    id: 'writer-wellness',
    label: 'Writer wellness',
    description: 'You took care of yourself while writing: food, sleep, a walk.',
    glyph: 'pulse',
  },
  {
    id: 'word-sprinter',
    label: 'Word sprinter',
    description: 'You joined a word sprint and your count got a boost.',
    glyph: 'runner',
  },
  {
    id: 'in-my-eye',
    label: 'Something in my eye',
    description: 'Your own story moved you to tears. You are its first reader.',
    glyph: 'tear',
  },
  {
    id: 'pantser',
    label: 'Pantser',
    description: 'You start with a blank page and your imagination, no outline.',
    glyph: 'pants',
  },
  {
    id: 'planner',
    label: 'Planner',
    description: 'You start with an outline, or at least lots of notes.',
    glyph: 'clipboard',
  },
  {
    id: 'plantser',
    label: 'Plantser',
    description: 'A comfortable mix of loose structure and improvisation.',
    glyph: 'map',
  },
  { id: 'camper', label: 'Camper', description: 'You took on a camp challenge in April or July.', glyph: 'tent' },
  { id: 'prep-month', label: 'Prep month', description: 'You spent October getting ready to write.', glyph: 'pencil' },
  {
    id: 'rebel',
    label: 'Rebel',
    description: 'Rules are meant to be broken: you are writing anything but a brand new novel.',
    glyph: 'shades',
  },
  {
    id: 'old-school',
    label: 'Old school',
    description: 'Tradition: the very first draft of a brand new novel.',
    glyph: 'typewriter',
  },
  { id: 'novel-maestro', label: 'Novel maestro', description: 'You made a soundtrack for your novel.', glyph: 'music' },
  {
    id: 'tell-the-world',
    label: 'Tell the world',
    description: 'You told people you are writing a novel.',
    glyph: 'megaphone',
  },
  {
    id: 'with-gratitude',
    label: 'With gratitude',
    description: 'You thanked someone who helped you write.',
    glyph: 'letter',
  },
  {
    id: 'caffeine',
    label: 'Caffeine overload',
    description: 'Third coffee of the day? This one is yours.',
    glyph: 'cup',
  },
  {
    id: 'killed-character',
    label: 'Killed a character',
    description: 'Someone in the story did not make it.',
    glyph: 'skull',
  },
  { id: 'finished-chapter', label: 'Finished a chapter', description: 'One more chapter closed.', glyph: 'book' },
  { id: 'met-characters', label: 'Met my characters', description: 'They started talking back.', glyph: 'heart' },
  { id: 'wrote-outside', label: 'Wrote away from home', description: 'A café, a park, a bus.', glyph: 'sun' },
  { id: 'shared-excerpt', label: 'Shared an excerpt', description: 'Someone read a piece of it.', glyph: 'quill' },
];

export const LIFETIME_MILESTONES = [
  [100_000, '100k'],
  [1_000_000, '1M'],
  [10_000_000, '10M'],
  [100_000_000, '100M'],
  [1_000_000_000, '1B'],
] as const;

export const LIFETIME_BADGES: Badge[] = LIFETIME_MILESTONES.map(([words, mark]) => ({
  id: `lifetime-${words}`,
  label: '{count} words in all',
  description: 'Wrote {count} words across all novels.',
  glyph: 'summit',
  mark,
}));

export const earnedLifetimeBadges = (totalWords: number): Set<string> =>
  new Set(LIFETIME_MILESTONES.filter(([words]) => totalWords >= words).map(([words]) => `lifetime-${words}`));

export const PARTICIPATION_BADGES: Badge[] = [
  { id: 'first-novel', label: 'New novel', description: 'Created a novel.', glyph: 'book' },
  { id: 'first-goal', label: 'Goal set', description: 'Gave a novel its first goal.', glyph: 'target' },
  { id: 'joined-event', label: 'Joined an event', description: 'Took part in a writing event.', glyph: 'calendar' },
  { id: 'cover-art', label: 'Cover art', description: 'Gave a novel a cover.', glyph: 'image' },
  { id: 'first-post', label: 'Dear diary', description: 'Wrote the first post about a novel.', glyph: 'letter' },
];

export const earnedParticipationBadges = ({
  projects,
  goals,
  posts,
}: {
  projects: { coverUrl: string | null }[];
  goals: { eventId?: string | null }[];
  posts: number;
}): Set<string> => {
  const earned = new Set<string>();
  const rules: [string, boolean][] = [
    ['first-novel', projects.length > 0],
    ['first-goal', goals.length > 0],
    ['joined-event', goals.some((goal) => Boolean(goal.eventId))],
    ['cover-art', projects.some((project) => project.coverUrl !== null)],
    ['first-post', posts > 0],
  ];

  rules.filter(([, met]) => met).forEach(([id]) => earned.add(id));

  return earned;
};

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
