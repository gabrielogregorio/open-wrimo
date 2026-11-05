import { fieldErrorsFrom, type FormState } from '@/lib/form';
import { UPLOAD_RULE, type RateLimiter } from '@/lib/auth/rate-limit';
import { prepareImage } from '@/lib/storage/images';
import type { ImageStorage, StoredImage } from '@/lib/storage/storage';
import { onlyPersonalBadges } from './badges';
import { localDate, localHour } from './dates';
import { eventGoal } from './events';
import { entriesForGoal } from './goals';
import type { WritingRepository } from './repository';
import { entryInputSchema, goalInputSchema, postInputSchema, projectInputSchema } from './schema';

export const PROJECT_NOT_FOUND = 'This project is not in your notebook.';
export const GOAL_NOT_FOUND = 'This goal no longer exists.';
const NOTHING_TO_ADD = 'Enter how much you wrote.';
export const POST_NOT_FOUND = 'This post no longer exists.';
export const UPLOADS_TOO_FAST = 'Wait a second before sending another image.';

export type WritingContext = {
  writing: WritingRepository;
  storage: ImageStorage;
  limiter: RateLimiter;
  userId: string;
  now: Date;
  timeZone: string;
  translate?: (text: string, values: Record<string, string | number>) => string;
};
export type WritingResult = FormState & { id?: string };

const fillIn = (text: string, values: Record<string, string | number>): string =>
  text.replace(/\{(\w+)\}/g, (_match, name: string) => String(values[name]));

const storeImage = async (
  { storage, limiter, userId, now }: WritingContext,
  bytes: Uint8Array,
  folder: string,
  field: string,
): Promise<{ image: StoredImage } | { fieldErrors: Record<string, string> }> => {
  if (!(await limiter.consume(`upload:${userId}`, UPLOAD_RULE, now)).allowed) {
    return { fieldErrors: { [field]: UPLOADS_TOO_FAST } };
  }

  const prepared = await prepareImage(bytes);

  if ('error' in prepared) {
    return { fieldErrors: { [field]: prepared.error } };
  }

  return { image: await storage.save({ bytes: prepared.image.bytes, kind: prepared.image.kind, folder }) };
};

export const saveProject = async (
  { writing, userId, now, timeZone, translate = fillIn }: WritingContext,
  input: Record<string, unknown>,
  projectId?: string,
): Promise<WritingResult> => {
  const parsed = projectInputSchema.safeParse(input);

  if (!parsed.success) {
    return { fieldErrors: fieldErrorsFrom(parsed.error) };
  }

  const { event, ...project } = parsed.data;

  if (projectId) {
    return (await writing.updateProject(userId, projectId, project, now))
      ? { id: projectId }
      : { error: PROJECT_NOT_FOUND };
  }

  const id = await writing.createProject(userId, project, now);

  if (event) {
    await writing.createGoal(userId, id, eventGoal(event, localDate(now, timeZone), translate), now);
  }

  return { id };
};

export const saveCover = async (
  context: WritingContext,
  projectId: string,
  bytes: Uint8Array | null,
): Promise<WritingResult> => {
  const { writing, storage, userId, now } = context;
  let image: StoredImage | null = null;

  if (bytes) {
    const stored = await storeImage(context, bytes, 'covers', 'cover');

    if ('fieldErrors' in stored) {
      return stored;
    }

    image = stored.image;
  }

  const previousKey = await writing.setCover(userId, projectId, image, now);

  if (previousKey === false) {
    await (image ? storage.remove(image.key) : Promise.resolve());

    return { error: PROJECT_NOT_FOUND };
  }

  if (previousKey) {
    await storage.remove(previousKey);
  }

  return { id: projectId, saved: true };
};

export const removeProject = async (
  { writing, storage, userId }: WritingContext,
  projectId: string,
): Promise<boolean> => {
  const imageKeys = await writing.removeProject(userId, projectId);

  if (!imageKeys) {
    return false;
  }

  await Promise.all(imageKeys.map((key) => storage.remove(key)));

  return true;
};

export const savePost = async (
  context: WritingContext,
  projectId: string,
  input: Record<string, unknown>,
  options: { image?: Uint8Array | null; removeImage?: boolean; postId?: string } = {},
): Promise<WritingResult> => {
  const { writing, storage, userId, now } = context;
  const parsed = postInputSchema.safeParse(input);

  if (!parsed.success) {
    return { fieldErrors: fieldErrorsFrom(parsed.error) };
  }

  let image: StoredImage | null | undefined = options.removeImage ? null : undefined;

  if (options.image) {
    const stored = await storeImage(context, options.image, 'posts', 'image');

    if ('fieldErrors' in stored) {
      return stored;
    }

    image = stored.image;
  }

  const discardNewImage = async (): Promise<void> => {
    await (image ? storage.remove(image.key) : Promise.resolve());
  };

  if (!options.postId) {
    const created = await writing.createPost(userId, projectId, parsed.data, image ?? null, now);

    if (!created) {
      await discardNewImage();

      return { error: PROJECT_NOT_FOUND };
    }

    return { id: created };
  }

  const previousKey = await writing.updatePost(userId, options.postId, parsed.data, image, now);

  if (previousKey === false) {
    await discardNewImage();

    return { error: POST_NOT_FOUND };
  }

  if (previousKey) {
    await storage.remove(previousKey);
  }

  return { id: options.postId };
};

export const removePost = async ({ writing, storage, userId }: WritingContext, postId: string): Promise<boolean> => {
  const imageKey = await writing.removePost(userId, postId);

  if (imageKey) {
    await storage.remove(imageKey);
  }

  return imageKey !== false;
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
  const [projects, goals, entries, posts] = await Promise.all([
    writing.listProjects(userId),
    writing.listGoals(userId),
    writing.listEntries(userId),
    writing.listPosts(userId),
  ]);

  return { exportedFrom: 'Open Wrimo', version: 1, projects, goals, entries, posts };
};
