// Copies the images uploaded before 0.2.1 into their owner's folder (`<kind>/<userId>/<file>`) and points
// every document and text at the copy. Planning only reads; applying copies one image at a time and keeps
// the original, with a record in image_migrations, so the change can be undone until the originals are
// removed. It can run again after a failure and picks up what is left.
import { ObjectId, type Db } from 'mongodb';
import { collections } from '@/lib/db/collections';
import { inlineImageKey, inlineKeysIn, ownedKey, replaceImage } from './owners';
import type { OwnedImageStorage } from './storage';

export type PlannedMove = { key: string; toKey: string; userId: string; source: string };
export type UnassignedImage = { key: string; userIds: string[] };
export type OwnerMigrationPlan = { moves: PlannedMove[]; unassigned: UnassignedImage[] };
export type OwnerMigrationResult = { done: string[]; failed: { key: string; error: string }[] };

const hex = (id: ObjectId): string => id.toHexString();

const escapeRegex = (text: string): string => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const addTo = (map: Map<string, Set<string>>, key: string, userId: string): void => {
  map.set(key, (map.get(key) ?? new Set()).add(userId));
};

type Planner = (key: string | null | undefined, userId: string, source: string) => void;

const planDocumentImages = async (database: Db, plan: Planner): Promise<void> => {
  const { projects, profiles, posts } = collections(database);

  for (const project of await projects.find({}, { projection: { userId: 1, coverKey: 1 } }).toArray()) {
    plan(project.coverKey, hex(project.userId), 'cover');
  }

  for (const profile of await profiles.find({}, { projection: { userId: 1, avatarKey: 1 } }).toArray()) {
    plan(profile.avatarKey, hex(profile.userId), 'avatar');
  }

  for (const post of await posts.find({}, { projection: { userId: 1, imageKey: 1 } }).toArray()) {
    plan(post.imageKey, hex(post.userId), 'post image');
  }
};

/** For each editor image, who uploaded it (from the upload records) and who shows it in a text. */
const editorImageAccounts = async (database: Db) => {
  const { projects, profiles, posts, accessLogs } = collections(database);
  const uploadedBy = new Map<string, Set<string>>();
  const shownBy = new Map<string, Set<string>>();

  for (const log of await accessLogs.find({ action: 'upload' }, { projection: { userId: 1, detail: 1 } }).toArray()) {
    if (log.userId && log.detail) {
      addTo(uploadedBy, log.detail, hex(log.userId));
    }
  }

  const texts = [
    ...(await projects.find({}, { projection: { userId: 1, excerpt: 1 } }).toArray()).map(
      (doc) => [doc.userId, doc.excerpt] as const,
    ),
    ...(await profiles.find({}, { projection: { userId: 1, bio: 1 } }).toArray()).map(
      (doc) => [doc.userId, doc.bio] as const,
    ),
    ...(await posts.find({}, { projection: { userId: 1, body: 1 } }).toArray()).map(
      (doc) => [doc.userId, doc.body] as const,
    ),
  ];

  for (const [userId, html] of texts) {
    inlineKeysIn(html).forEach((key) => addTo(shownBy, key, hex(userId)));
  }

  return { uploadedBy, shownBy };
};

export const planImageOwners = async (database: Db): Promise<OwnerMigrationPlan> => {
  const moves = new Map<string, PlannedMove>();
  const plan: Planner = (key, userId, source) => {
    const toKey = key ? ownedKey(key, userId) : null;

    if (key && toKey && !moves.has(key)) {
      moves.set(key, { key, toKey, userId, source });
    }
  };

  await planDocumentImages(database, plan);

  // Editor images belong to whoever uploaded them; without an upload record, to the only account that
  // shows them. One shown by several accounts and uploaded by none is left for a person to decide.
  const { uploadedBy, shownBy } = await editorImageAccounts(database);
  const unassigned: UnassignedImage[] = [];

  const ownersOf = new Map([...shownBy, ...uploadedBy]);

  for (const [key, accounts] of ownersOf) {
    const owners = [...accounts];

    if (moves.has(key) || !ownedKey(key, 'x')) {
      continue;
    }

    if (owners.length === 1) {
      plan(key, owners[0], 'editor image');
    } else {
      unassigned.push({ key, userIds: owners.sort() });
    }
  }

  return { moves: [...moves.values()], unassigned };
};

/** Points every document and text that uses `key` at the moved image. */
const pointAt = async (database: Db, key: string, image: { key: string; url: string }): Promise<void> => {
  const { projects, profiles, posts, accessLogs } = collections(database);
  const named = { $regex: escapeRegex(key) };

  await projects.updateMany({ coverKey: key }, { $set: { coverKey: image.key, coverUrl: image.url } });
  await profiles.updateMany({ avatarKey: key }, { $set: { avatarKey: image.key, avatarUrl: image.url } });
  await posts.updateMany({ imageKey: key }, { $set: { imageKey: image.key, imageUrl: image.url } });
  await accessLogs.updateMany({ detail: key }, { $set: { detail: image.key } });

  for (const project of await projects.find({ excerpt: named }, { projection: { excerpt: 1 } }).toArray()) {
    await projects.updateOne(
      { _id: project._id },
      { $set: { excerpt: replaceImage(project.excerpt, key, image.url) } },
    );
  }

  for (const profile of await profiles.find({ bio: named }, { projection: { bio: 1 } }).toArray()) {
    await profiles.updateOne({ _id: profile._id }, { $set: { bio: replaceImage(profile.bio, key, image.url) } });
  }

  for (const post of await posts.find({ body: named }, { projection: { body: 1 } }).toArray()) {
    await posts.updateOne({ _id: post._id }, { $set: { body: replaceImage(post.body, key, image.url) } });
  }
};

const IMAGE_SOURCES = /<img\b[^>]*?\bsrc="([^"]+)"/gi;

/** The address the documents use for `key` today, so --undo can put exactly that one back. */
const currentUrl = async (database: Db, key: string, storage: OwnedImageStorage): Promise<string> => {
  const { projects, profiles, posts } = collections(database);
  const named = { $regex: escapeRegex(key) };
  const found =
    (await projects.findOne({ coverKey: key }))?.coverUrl ??
    (await profiles.findOne({ avatarKey: key }))?.avatarUrl ??
    (await posts.findOne({ imageKey: key }))?.imageUrl;
  const texts = [
    (await projects.findOne({ excerpt: named }))?.excerpt,
    (await profiles.findOne({ bio: named }))?.bio,
    (await posts.findOne({ body: named }))?.body,
  ];
  const inText = texts
    .flatMap((html) => [...(html ?? '').matchAll(IMAGE_SOURCES)].map((match) => match[1]))
    .find((source) => inlineImageKey(source) === key);

  return found ?? inText ?? storage.urlFor(key);
};

const run = async <Item>(
  items: Item[],
  keyOf: (item: Item) => string,
  work: (item: Item) => Promise<void>,
  onProgress: (done: number, total: number) => void,
): Promise<OwnerMigrationResult> => {
  const result: OwnerMigrationResult = { done: [], failed: [] };

  for (const item of items) {
    try {
      await work(item);
      result.done.push(keyOf(item));
    } catch (error) {
      result.failed.push({ key: keyOf(item), error: error instanceof Error ? error.message : String(error) });
    }

    onProgress(result.done.length + result.failed.length, items.length);
  }

  return result;
};

type Progress = (done: number, total: number) => void;

const quiet: Progress = () => undefined;

/** Copies each planned image into its owner's folder, points everything at the copy and records it. */
export const applyImageOwners = (
  database: Db,
  storage: OwnedImageStorage,
  plan: OwnerMigrationPlan,
  onProgress: Progress = quiet,
): Promise<OwnerMigrationResult> =>
  run(
    plan.moves,
    (move) => move.key,
    async (move) => {
      const fromUrl = await currentUrl(database, move.key, storage);
      const copy = await storage.copy(move.key, move.toKey);
      await pointAt(database, move.key, copy);
      await collections(database).imageMigrations.insertOne({
        userId: new ObjectId(move.userId),
        fromKey: move.key,
        fromUrl,
        toKey: copy.key,
        toUrl: copy.url,
        copiedAt: new Date(),
      });
    },
    onProgress,
  );

/** Points everything back at the originals and deletes the copies. */
export const undoImageOwners = async (
  database: Db,
  storage: OwnedImageStorage,
  onProgress: Progress = quiet,
): Promise<OwnerMigrationResult> => {
  const { imageMigrations } = collections(database);

  return run(
    await imageMigrations.find().toArray(),
    (migration) => migration.fromKey,
    async (migration) => {
      await pointAt(database, migration.toKey, { key: migration.fromKey, url: migration.fromUrl });
      await storage.remove(migration.toKey);
      await imageMigrations.deleteOne({ _id: migration._id });
    },
    onProgress,
  );
};

/** Deletes the originals once the copies are checked; after this there is nothing to undo. */
export const removeOldImages = async (
  database: Db,
  storage: OwnedImageStorage,
  onProgress: Progress = quiet,
): Promise<OwnerMigrationResult> => {
  const { imageMigrations } = collections(database);

  return run(
    await imageMigrations.find().toArray(),
    (migration) => migration.fromKey,
    async (migration) => {
      await storage.remove(migration.fromKey);
      await imageMigrations.deleteOne({ _id: migration._id });
    },
    onProgress,
  );
};
