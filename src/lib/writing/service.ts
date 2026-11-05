import { fieldErrorsFrom, type FormState } from '@/lib/form';
import { onlyPersonalBadges } from './badges';
import { localDate, localHour } from './dates';
import { entriesForGoal } from './goals';
import type { WritingRepository } from './repository';
import { entryInputSchema, goalInputSchema, projectInputSchema } from './schema';

export const PROJECT_NOT_FOUND = 'This project is not in your notebook.';
export const GOAL_NOT_FOUND = 'This goal no longer exists.';
export const COVER_TOO_BIG = 'Use an image up to 2 MB.';
export const COVER_WRONG_TYPE = 'Use a PNG, JPEG, WebP or GIF image.';
const NOTHING_TO_ADD = 'Enter how much you wrote.';

export const MAX_COVER_BYTES = 2 * 1024 * 1024;

export type WritingContext = { writing: WritingRepository; userId: string; now: Date; timeZone: string };
export type WritingResult = FormState & { id?: string };

const SIGNATURES: { contentType: string; matches: (bytes: Uint8Array) => boolean }[] = [
  {
    contentType: 'image/png',
    matches: (bytes) => [0x89, 0x50, 0x4e, 0x47].every((byte, index) => bytes[index] === byte),
  },
  { contentType: 'image/jpeg', matches: (bytes) => bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff },
  { contentType: 'image/gif', matches: (bytes) => String.fromCharCode(...bytes.slice(0, 4)) === 'GIF8' },
  {
    contentType: 'image/webp',
    matches: (bytes) =>
      String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' && String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP',
  },
];

export const coverTypeOf = (bytes: Uint8Array): string | null =>
  SIGNATURES.find((signature) => signature.matches(bytes))?.contentType ?? null;

export const saveProject = async (
  { writing, userId, now }: WritingContext,
  input: Record<string, unknown>,
  projectId?: string,
): Promise<WritingResult> => {
  const parsed = projectInputSchema.safeParse(input);

  if (!parsed.success) {
    return { fieldErrors: fieldErrorsFrom(parsed.error) };
  }

  if (!projectId) {
    return { id: await writing.createProject(userId, parsed.data, now) };
  }

  return (await writing.updateProject(userId, projectId, parsed.data, now))
    ? { id: projectId }
    : { error: PROJECT_NOT_FOUND };
};

export const saveCover = async (
  { writing, userId, now }: WritingContext,
  projectId: string,
  bytes: Uint8Array,
): Promise<WritingResult> => {
  if (bytes.byteLength > MAX_COVER_BYTES) {
    return { fieldErrors: { cover: COVER_TOO_BIG } };
  }

  const contentType = coverTypeOf(bytes);

  if (!contentType) {
    return { fieldErrors: { cover: COVER_WRONG_TYPE } };
  }

  return (await writing.saveCover(userId, projectId, { contentType, data: bytes }, now))
    ? { id: projectId, saved: true }
    : { error: PROJECT_NOT_FOUND };
};

export const saveGoal = async (
  { writing, userId, now }: WritingContext,
  projectId: string,
  input: Record<string, unknown>,
  goalId?: string,
): Promise<WritingResult> => {
  const parsed = goalInputSchema.safeParse(input);

  if (!parsed.success) {
    return { fieldErrors: fieldErrorsFrom(parsed.error) };
  }

  if (goalId) {
    return (await writing.updateGoal(userId, goalId, parsed.data)) ? { id: goalId } : { error: GOAL_NOT_FOUND };
  }

  const created = await writing.createGoal(userId, projectId, parsed.data, now);

  return created ? { id: created } : { error: PROJECT_NOT_FOUND };
};

export const logProgress = async (
  { writing, userId, now, timeZone }: WritingContext,
  goalId: string,
  input: Record<string, unknown>,
  source: 'update' | 'sprint' = 'update',
): Promise<WritingResult> => {
  const goal = await writing.getGoal(userId, goalId);

  if (!goal) {
    return { error: GOAL_NOT_FOUND };
  }

  const parsed = entryInputSchema.safeParse(input);

  if (!parsed.success) {
    return { fieldErrors: fieldErrorsFrom(parsed.error) };
  }

  const { mode, count, date, mood, place } = parsed.data;
  let change = count;

  if (mode === 'set') {
    const counted = entriesForGoal(
      goal,
      await writing.listEntries(userId, { projectId: goal.projectId, unit: goal.unit }),
    );
    change = count - counted.reduce((sum, entry) => sum + entry.count, 0);
  }

  if (change === 0) {
    return mode === 'add' ? { fieldErrors: { count: NOTHING_TO_ADD } } : { id: goalId, saved: true };
  }

  await writing.addEntry(
    userId,
    {
      projectId: goal.projectId,
      unit: goal.unit,
      date,
      count: change,
      mood,
      place,
      source,
      hour: date === localDate(now, timeZone) ? localHour(now, timeZone) : -1,
    },
    now,
  );

  return { id: goalId, saved: true };
};

export const setPersonalBadges = async (
  { writing, userId, now }: WritingContext,
  projectId: string,
  ids: string[],
): Promise<WritingResult> =>
  (await writing.setAwards(userId, projectId, onlyPersonalBadges(ids), now))
    ? { id: projectId, saved: true }
    : { error: PROJECT_NOT_FOUND };

export const exportNotebook = async ({ writing, userId }: WritingContext) => {
  const [projects, goals, entries] = await Promise.all([
    writing.listProjects(userId),
    writing.listGoals(userId),
    writing.listEntries(userId),
  ]);

  return { exportedFrom: 'Open Wrimo', version: 1, projects, goals, entries };
};
