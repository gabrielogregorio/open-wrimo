import { fieldErrorsFrom, type FormState } from '@/lib/form';
import { UPLOAD_RULE, type RateLimiter } from '@/lib/auth/rate-limit';
import { prepareImage } from '@/lib/storage/images';
import type { ProfileSection } from '@/lib/db/collections';
import type { ImageStorage, StoredImage } from '@/lib/storage/storage';
import { onlyPersonalBadges } from './badges';
import { addDays, localDate, localHour } from './dates';
import { eventGoal } from './events';
import { sanitizeRichText } from './rich-text';
import { entriesForGoal } from './goals';
import type { WritingRepository } from './repository';
import { entryInputSchema, goalInputSchema, postInputSchema, profileInputSchema, projectInputSchema } from './schema';

export const PROJECT_NOT_FOUND = 'This project is not in your notebook.';
export const GOAL_NOT_FOUND = 'This goal no longer exists.';
const NOTHING_TO_ADD = 'Enter how much you wrote.';
const PERIOD_GOAL_NAMES = { daily: 'Daily goal', monthly: 'Monthly goal', yearly: 'Yearly goal' } as const;
export const USERNAME_TAKEN_HERE = 'This username is taken.';
export const POST_NOT_FOUND = 'This post no longer exists.';
export const IMAGE_NOT_STORED = 'The image could not be stored right now. Try again in a moment.';
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

  try {
    return { image: await storage.save({ bytes: prepared.image.bytes, kind: prepared.image.kind, folder }) };
  } catch (error) {
    console.error('Image storage failed', error);

    return { fieldErrors: { [field]: IMAGE_NOT_STORED } };
  }
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

  const { event, period, periodTarget, ...fields } = parsed.data;
  const project = { ...fields, excerpt: sanitizeRichText(fields.excerpt) };

  if (projectId) {
    return (await writing.updateProject(userId, projectId, project, now))
      ? { id: projectId }
      : { error: PROJECT_NOT_FOUND };
  }

  const id = await writing.createProject(userId, project, now);

  if (period && periodTarget) {
    const today = localDate(now, timeZone);
    const name = translate(PERIOD_GOAL_NAMES[period], {});
    const span = { startDate: today, endDate: addDays(today, 365) };
    await writing.createGoal(userId, id, { name, unit: 'words', target: periodTarget, ...span, period }, now);
  }

  if (event) {
    await writing.createGoal(
      userId,
      id,
      { ...eventGoal(event, localDate(now, timeZone), translate), eventId: event },
      now,
    );
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
    const post = { ...parsed.data, body: sanitizeRichText(parsed.data.body) };
    const created = await writing.createPost(userId, projectId, post, image ?? null, now);

    if (!created) {
      await discardNewImage();

      return { error: PROJECT_NOT_FOUND };
    }

    return { id: created };
  }

  const previousKey = await writing.updatePost(
    userId,
    options.postId,
    { ...parsed.data, body: sanitizeRichText(parsed.data.body) },
    image,
    now,
  );

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

  if (change > 0) {
    await writing.markStarted(userId, goal.projectId, now);
  }

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

export const saveInlineImage = async (
  context: WritingContext,
  bytes: Uint8Array,
): Promise<{ url: string } | { error: string }> => {
  const stored = await storeImage(context, bytes, 'inline', 'image');

  return 'image' in stored ? { url: stored.image.url } : { error: stored.fieldErrors.image };
};

export const saveProfile = async (
  context: WritingContext,
  input: Record<string, unknown>,
  avatar: { bytes: Uint8Array | null; remove: boolean },
  shown: Record<ProfileSection, boolean> = { bio: true, stats: true, favorites: true, badges: true },
): Promise<WritingResult> => {
  const { writing, storage, userId, now } = context;
  const parsed = profileInputSchema.safeParse(input);

  if (!parsed.success) {
    return { fieldErrors: fieldErrorsFrom(parsed.error) };
  }

  if (avatar.bytes || avatar.remove) {
    let image: StoredImage | null = null;

    if (avatar.bytes) {
      const stored = await storeImage(context, avatar.bytes, 'avatars', 'avatar');

      if ('fieldErrors' in stored) {
        return stored;
      }

      image = stored.image;
    }

    const previousKey = await writing.setAvatar(userId, image, now);

    if (previousKey) {
      await storage.remove(previousKey);
    }
  }

  if (!(await writing.saveProfile(userId, parsed.data, shown, now))) {
    return { fieldErrors: { username: USERNAME_TAKEN_HERE } };
  }

  return { saved: true };
};
