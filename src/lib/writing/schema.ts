import { z } from 'zod';
import { isIsoDate } from './dates';
import { usernameField } from '@/lib/auth/schema';
import { EVENT_IDS } from './events';

export const PROJECT_STATUSES = ['not-started', 'in-progress', 'completed', 'on-hiatus'] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export const PROJECT_TYPES = [
  'novel',
  'novella',
  'short-stories',
  'nonfiction',
  'memoir',
  'poetry',
  'script',
  'other',
] as const;
export type ProjectType = (typeof PROJECT_TYPES)[number];

export const GOAL_UNITS = ['words', 'hours', 'minutes', 'lines', 'pages'] as const;
export type GoalUnit = (typeof GOAL_UNITS)[number];

export const GOAL_PERIODS = ['daily', 'monthly', 'yearly'] as const;
export type GoalPeriod = (typeof GOAL_PERIODS)[number];

const optionalPeriod = z.preprocess(
  (value) => (value === undefined || value === '' ? null : value),
  z.enum(GOAL_PERIODS, { error: 'Choose how often the goal repeats.' }).nullable(),
);

export const MOODS = ['inspired', 'steady', 'tired', 'stuck', 'proud'] as const;
export type Mood = (typeof MOODS)[number];

export const GOAL_FILTERS = ['all', 'active', 'upcoming', 'ended'] as const;
export type GoalFilter = (typeof GOAL_FILTERS)[number];

export const MAX_GENRES = 10;
export const MAX_GOAL_DAYS = 366;
export const MAX_GOAL_TARGET = 10_000_000;
export const MAX_ENTRY_COUNT = 10_000_000;
const GENRE_MAX_LENGTH = 40;

const text = (maximum: number, message: string) => z.string().trim().max(maximum, { error: message }).default('');

const optionalUrl = (message: string) =>
  z
    .string()
    .trim()
    .max(500, { error: message })
    .refine((value) => value === '' || /^https:\/\/[^\s]+$/i.test(value), { error: message })
    .default('');

const isoDate = (message: string) => z.string().trim().refine(isIsoDate, { error: message });

const genres = z.preprocess(
  (value) =>
    typeof value === 'string'
      ? [
          ...new Set(
            value
              .split(',')
              .map((genre) => genre.trim())
              .filter(Boolean),
          ),
        ]
      : value,
  z
    .array(z.string().max(GENRE_MAX_LENGTH, { error: 'Keep each genre under 40 characters.' }))
    .max(MAX_GENRES, { error: 'Pick up to 10 genres.' }),
);

export const projectInputSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, { error: 'Enter a title up to 200 characters.' })
    .max(200, { error: 'Enter a title up to 200 characters.' }),
  status: z.enum(PROJECT_STATUSES, { error: 'Choose a project status.' }),
  type: z.enum(PROJECT_TYPES, { error: 'Choose a project type.' }),
  genres,
  summary: text(2000, 'Keep the summary under 2000 characters.'),
  excerpt: text(100000, 'Keep the additional details shorter.'),
  pinterestUrl: optionalUrl('Enter an https:// address.'),
  playlistUrl: optionalUrl('Enter an https:// address.'),
  featured: z.preprocess((value) => value === 'on' || value === true, z.boolean()),
  isPublic: z.preprocess((value) => value === 'on' || value === true, z.boolean()),
  // Words written before the novel came to Open Wrimo: they count in its total, not in goals or streaks.
  wordsBefore: z.preprocess(
    (value) => (value === undefined || value === '' || value === null ? 0 : value),
    z.coerce
      .number({ error: 'Enter a number from 0 to 10000000.' })
      .int({ error: 'Enter a number from 0 to 10000000.' })
      .min(0, { error: 'Enter a number from 0 to 10000000.' })
      .max(MAX_GOAL_TARGET, { error: 'Enter a number from 0 to 10000000.' }),
  ),
  periodTarget: z.preprocess(
    (value) => (value === undefined || value === '' ? null : value),
    z.coerce
      .number({ error: 'Enter a target from 1 to 10000000.' })
      .int({ error: 'Enter a target from 1 to 10000000.' })
      .min(1, { error: 'Enter a target from 1 to 10000000.' })
      .max(MAX_GOAL_TARGET, { error: 'Enter a target from 1 to 10000000.' })
      .nullable(),
  ),
  period: optionalPeriod,
  event: z.preprocess(
    (value) => (value === undefined || value === '' ? null : value),
    z.enum(EVENT_IDS, { error: 'Choose an event from the list.' }).nullable(),
  ),
});

export const postInputSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, { error: 'Enter a title up to 200 characters.' })
    .max(200, { error: 'Enter a title up to 200 characters.' }),
  body: z
    .string()
    .trim()
    .min(1, { error: 'Write something in the post.' })
    .max(200000, { error: 'Keep the post shorter.' }),
});

const count = (maximum: number, message: string) =>
  z.coerce
    .number({ error: message })
    .int({ error: message })
    .min(1, { error: message })
    .max(maximum, { error: message });

export const goalInputSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, { error: 'Name the goal in up to 120 characters.' })
      .max(120, { error: 'Name the goal in up to 120 characters.' }),
    unit: z.enum(GOAL_UNITS, { error: 'Choose what the goal counts.' }),
    target: count(MAX_GOAL_TARGET, 'Enter a target from 1 to 10000000.'),
    startDate: isoDate('Enter a valid date.'),
    endDate: isoDate('Enter a valid date.'),
    period: optionalPeriod,
  })
  .refine((goal) => goal.endDate >= goal.startDate, { path: ['endDate'], error: 'End on or after the start.' })
  .refine((goal) => (Date.parse(goal.endDate) - Date.parse(goal.startDate)) / 86_400_000 < MAX_GOAL_DAYS, {
    path: ['endDate'],
    error: 'Keep a goal within 366 days.',
  });

const optionalMood = z.preprocess(
  (value) => (value === '' || value === undefined ? null : value),
  z.enum(MOODS, { error: 'Choose how it felt.' }).nullable(),
);

export const entryInputSchema = z.object({
  mode: z.enum(['add', 'set'], { error: 'Choose to add or to set the total.' }),
  count: z.coerce
    .number({ error: 'Enter a number from 0 to 10000000.' })
    .int({ error: 'Enter a number from 0 to 10000000.' })
    .min(0, { error: 'Enter a number from 0 to 10000000.' })
    .max(MAX_ENTRY_COUNT, { error: 'Enter a number from 0 to 10000000.' }),
  date: isoDate('Enter a valid date.'),
  mood: optionalMood,
  place: text(80, 'Keep the place under 80 characters.'),
});

export type ProjectInput = z.infer<typeof projectInputSchema>;
export type GoalInput = z.infer<typeof goalInputSchema>;
export type EntryInput = z.infer<typeof entryInputSchema>;
export type PostInput = z.infer<typeof postInputSchema>;
export type ProjectFields = Omit<ProjectInput, 'event' | 'period' | 'periodTarget'>;

export const PROJECT_FIELDS = [
  'title',
  'status',
  'type',
  'genres',
  'summary',
  'excerpt',
  'pinterestUrl',
  'playlistUrl',
  'featured',
  'isPublic',
  'wordsBefore',
  'event',
  'period',
  'periodTarget',
] as const;
export const POST_FIELDS = ['title', 'body'] as const;

export const profileInputSchema = z.object({
  username: usernameField,
  isPublic: z.preprocess((value) => value === 'on' || value === true, z.boolean()),
  name: z
    .string()
    .trim()
    .min(1, { error: 'Enter a name up to 80 characters.' })
    .max(80, { error: 'Enter a name up to 80 characters.' }),
  bio: text(4000, 'Keep the bio under 4000 characters.'),
  location: text(120, 'Keep it under 120 characters.'),
  writingTime: text(120, 'Keep it under 120 characters.'),
  favoriteBooks: text(1000, 'Keep the list under 1000 characters.'),
  favoriteAuthors: text(1000, 'Keep the list under 1000 characters.'),
});

export type ProfileInput = z.infer<typeof profileInputSchema>;
export const PROFILE_FIELDS = [
  'name',
  'username',
  'isPublic',
  'bio',
  'location',
  'writingTime',
  'favoriteBooks',
  'favoriteAuthors',
] as const;
export const GOAL_FIELDS = ['name', 'unit', 'target', 'startDate', 'endDate', 'period'] as const;
export const ENTRY_FIELDS = ['mode', 'count', 'date', 'mood', 'place'] as const;
