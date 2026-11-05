import { ObjectId, type Db } from 'mongodb';
import {
  collections,
  type EntryDocument,
  type StoredEntry,
  type StoredGoal,
  type StoredPost,
  type StoredProject,
} from '@/lib/db/collections';
import type { StoredImage } from '@/lib/storage/storage';
import type { EventId } from './events';
import {
  PROJECT_STATUSES,
  type GoalInput,
  type GoalUnit,
  type Mood,
  type PostInput,
  type ProjectInput,
} from './schema';

export type ProjectView = Omit<ProjectInput, 'event'> & {
  id: string;
  awards: string[];
  coverUrl: string | null;
  updatedAt: string;
};

export type GoalView = GoalInput & { id: string; projectId: string; eventId?: EventId | null };

export type EntryView = {
  id: string;
  projectId: string;
  unit: GoalUnit;
  date: string;
  count: number;
  mood: Mood | null;
  place: string;
  source: 'update' | 'sprint';
  hour: number;
  createdAt: string;
};

export type PreviousImageKey = string | null | false;
export type NewEntry = Omit<EntryView, 'id' | 'createdAt'>;
export type PostView = PostInput & {
  id: string;
  projectId: string;
  imageUrl: string | null;
  createdAt: string;
  updatedAt: string;
};

const toProjectView = (project: StoredProject): ProjectView => ({
  id: project._id.toHexString(),
  title: project.title,
  status: (PROJECT_STATUSES as readonly string[]).includes(project.status) ? project.status : 'in-progress',
  type: project.type,
  genres: project.genres,
  summary: project.summary,
  excerpt: project.excerpt,
  pinterestUrl: project.pinterestUrl,
  playlistUrl: project.playlistUrl,
  featured: project.featured,
  awards: project.awards,
  coverUrl: project.coverUrl,
  updatedAt: project.updatedAt.toISOString(),
});

const toGoalView = (goal: StoredGoal): GoalView => ({
  id: goal._id.toHexString(),
  projectId: goal.projectId.toHexString(),
  name: goal.name,
  unit: goal.unit,
  target: goal.target,
  startDate: goal.startDate,
  endDate: goal.endDate,
  eventId: goal.eventId ?? null,
});

const toEntryView = (entry: StoredEntry): EntryView => ({
  id: entry._id.toHexString(),
  projectId: entry.projectId.toHexString(),
  unit: entry.unit,
  date: entry.date,
  count: entry.count,
  mood: entry.mood,
  place: entry.place,
  source: entry.source,
  hour: entry.hour,
  createdAt: entry.createdAt.toISOString(),
});

const toPostView = (post: StoredPost): PostView => ({
  id: post._id.toHexString(),
  projectId: post.projectId.toHexString(),
  title: post.title,
  body: post.body,
  imageUrl: post.imageUrl,
  createdAt: post.createdAt.toISOString(),
  updatedAt: post.updatedAt.toISOString(),
});

const objectIdOrNull = (value: string): ObjectId | null => (ObjectId.isValid(value) ? new ObjectId(value) : null);

export type WritingRepository = ReturnType<typeof createWritingRepository>;

export const createWritingRepository = (database: Db) => {
  const { projects, goals, entries, posts } = collections(database);

  const owned = (userId: string, id: string) => {
    const objectId = objectIdOrNull(id);

    return objectId ? { _id: objectId, userId: new ObjectId(userId) } : null;
  };

  const unfeatureOthers = async (userId: string, keep: ObjectId): Promise<void> => {
    await projects.updateMany({ userId: new ObjectId(userId), _id: { $ne: keep } }, { $set: { featured: false } });
  };

  return {
    async listProjects(userId: string): Promise<ProjectView[]> {
      const found = await projects
        .find({ userId: new ObjectId(userId) })
        .sort({ featured: -1, updatedAt: -1, _id: -1 })
        .toArray();

      return found.map(toProjectView);
    },

    async getProject(userId: string, projectId: string): Promise<ProjectView | null> {
      const filter = owned(userId, projectId);
      const project = filter ? await projects.findOne(filter) : null;

      return project ? toProjectView(project) : null;
    },

    async createProject(userId: string, input: Omit<ProjectInput, 'event'>, now: Date): Promise<string> {
      const { insertedId } = await projects.insertOne({
        ...input,
        userId: new ObjectId(userId),
        awards: [],
        coverUrl: null,
        coverKey: null,
        createdAt: now,
        updatedAt: now,
      });

      if (input.featured) {
        await unfeatureOthers(userId, insertedId);
      }

      return insertedId.toHexString();
    },

    async updateProject(
      userId: string,
      projectId: string,
      input: Omit<ProjectInput, 'event'>,
      now: Date,
    ): Promise<boolean> {
      const filter = owned(userId, projectId);

      if (!filter) {
        return false;
      }

      const { matchedCount } = await projects.updateOne(filter, { $set: { ...input, updatedAt: now } });

      if (matchedCount === 1 && input.featured) {
        await unfeatureOthers(userId, filter._id);
      }

      return matchedCount === 1;
    },

    async markStarted(userId: string, projectId: string, now: Date): Promise<void> {
      const filter = owned(userId, projectId);

      if (filter) {
        await projects.updateOne(
          { ...filter, status: 'not-started' },
          { $set: { status: 'in-progress', updatedAt: now } },
        );
      }
    },

    async setAwards(userId: string, projectId: string, awards: string[], now: Date): Promise<boolean> {
      const filter = owned(userId, projectId);
      const result = filter ? await projects.updateOne(filter, { $set: { awards, updatedAt: now } }) : null;

      return result?.matchedCount === 1;
    },

    async removeProject(userId: string, projectId: string): Promise<string[] | null> {
      const filter = owned(userId, projectId);
      const project = filter ? await projects.findOneAndDelete(filter) : null;

      if (!filter || !project) {
        return null;
      }

      const children = { userId: filter.userId, projectId: filter._id };
      const postImages = await posts.find({ ...children, imageKey: { $ne: null } }).toArray();
      await Promise.all([goals.deleteMany(children), entries.deleteMany(children), posts.deleteMany(children)]);

      return [project.coverKey, ...postImages.map((post) => post.imageKey)].filter(
        (key): key is string => key !== null,
      );
    },

    async setCover(userId: string, projectId: string, image: StoredImage | null, now: Date): Promise<PreviousImageKey> {
      const filter = owned(userId, projectId);
      const before = filter
        ? await projects.findOneAndUpdate(filter, {
            $set: { coverUrl: image?.url ?? null, coverKey: image?.key ?? null, updatedAt: now },
          })
        : null;

      return before ? before.coverKey : false;
    },

    async listGoals(userId: string, projectId?: string): Promise<GoalView[]> {
      const owner = new ObjectId(userId);
      const projectObjectId = projectId === undefined ? undefined : objectIdOrNull(projectId);

      if (projectObjectId === null) {
        return [];
      }

      const found = await goals
        .find(projectObjectId ? { userId: owner, projectId: projectObjectId } : { userId: owner })
        .sort({ startDate: -1, _id: -1 })
        .toArray();

      return found.map(toGoalView);
    },

    async getGoal(userId: string, goalId: string): Promise<GoalView | null> {
      const filter = owned(userId, goalId);
      const goal = filter ? await goals.findOne(filter) : null;

      return goal ? toGoalView(goal) : null;
    },

    async createGoal(
      userId: string,
      projectId: string,
      input: GoalInput & { eventId?: EventId | null },
      now: Date,
    ): Promise<string | null> {
      const filter = owned(userId, projectId);

      if (!filter || (await projects.countDocuments(filter, { limit: 1 })) === 0) {
        return null;
      }

      const { insertedId } = await goals.insertOne({
        ...input,
        userId: new ObjectId(userId),
        projectId: new ObjectId(projectId),
        createdAt: now,
      });

      return insertedId.toHexString();
    },

    async updateGoal(userId: string, goalId: string, input: GoalInput): Promise<boolean> {
      const filter = owned(userId, goalId);
      const result = filter ? await goals.updateOne(filter, { $set: input }) : null;

      return result?.matchedCount === 1;
    },

    async removeGoal(userId: string, goalId: string): Promise<boolean> {
      const filter = owned(userId, goalId);
      const result = filter ? await goals.deleteOne(filter) : null;

      return result?.deletedCount === 1;
    },

    async listEntries(userId: string, scope: { projectId?: string; unit?: GoalUnit } = {}): Promise<EntryView[]> {
      const projectObjectId = scope.projectId === undefined ? undefined : objectIdOrNull(scope.projectId);

      if (projectObjectId === null) {
        return [];
      }

      const filter: Partial<EntryDocument> = { userId: new ObjectId(userId) };

      if (projectObjectId) {
        filter.projectId = projectObjectId;
      }

      if (scope.unit) {
        filter.unit = scope.unit;
      }

      const found = await entries.find(filter).sort({ date: -1, createdAt: -1, _id: -1 }).toArray();

      return found.map(toEntryView);
    },

    async addEntry(userId: string, entry: NewEntry, now: Date): Promise<string> {
      const { insertedId } = await entries.insertOne({
        ...entry,
        userId: new ObjectId(userId),
        projectId: new ObjectId(entry.projectId),
        createdAt: now,
      });

      return insertedId.toHexString();
    },

    async removeEntry(userId: string, entryId: string): Promise<boolean> {
      const filter = owned(userId, entryId);
      const result = filter ? await entries.deleteOne(filter) : null;

      return result?.deletedCount === 1;
    },

    async listPosts(userId: string, projectId?: string): Promise<PostView[]> {
      const owner = new ObjectId(userId);
      const projectObjectId = projectId === undefined ? undefined : objectIdOrNull(projectId);

      if (projectObjectId === null) {
        return [];
      }

      const found = await posts
        .find(projectObjectId ? { userId: owner, projectId: projectObjectId } : { userId: owner })
        .sort({ createdAt: -1, _id: -1 })
        .toArray();

      return found.map(toPostView);
    },

    async getPost(userId: string, postId: string): Promise<PostView | null> {
      const filter = owned(userId, postId);
      const post = filter ? await posts.findOne(filter) : null;

      return post ? toPostView(post) : null;
    },

    async createPost(
      userId: string,
      projectId: string,
      input: PostInput,
      image: StoredImage | null,
      now: Date,
    ): Promise<string | null> {
      const filter = owned(userId, projectId);

      if (!filter || (await projects.countDocuments(filter, { limit: 1 })) === 0) {
        return null;
      }

      const { insertedId } = await posts.insertOne({
        ...input,
        userId: filter.userId,
        projectId: filter._id,
        imageUrl: image?.url ?? null,
        imageKey: image?.key ?? null,
        createdAt: now,
        updatedAt: now,
      });

      return insertedId.toHexString();
    },

    async updatePost(
      userId: string,
      postId: string,
      input: PostInput,
      image: StoredImage | null | undefined,
      now: Date,
    ): Promise<PreviousImageKey> {
      const filter = owned(userId, postId);
      const imageChange = image === undefined ? {} : { imageUrl: image?.url ?? null, imageKey: image?.key ?? null };
      const before = filter
        ? await posts.findOneAndUpdate(filter, { $set: { ...input, ...imageChange, updatedAt: now } })
        : null;

      if (!before) {
        return false;
      }

      return image === undefined ? null : before.imageKey;
    },

    async removePost(userId: string, postId: string): Promise<PreviousImageKey> {
      const filter = owned(userId, postId);
      const removed = filter ? await posts.findOneAndDelete(filter) : null;

      return removed ? removed.imageKey : false;
    },
  };
};
