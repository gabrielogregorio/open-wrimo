import { Binary, ObjectId, type Db } from 'mongodb';
import {
  collections,
  type EntryDocument,
  type StoredEntry,
  type StoredGoal,
  type StoredProject,
} from '@/lib/db/collections';
import type { GoalInput, GoalUnit, Mood, ProjectInput } from './schema';

export type ProjectView = ProjectInput & {
  id: string;
  awards: string[];
  coverUrl: string | null;
  updatedAt: string;
};

export type GoalView = GoalInput & { id: string; projectId: string };

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

export type NewEntry = Omit<EntryView, 'id' | 'createdAt'>;
export type Cover = { contentType: string; data: Uint8Array };

const toProjectView = (project: StoredProject): ProjectView => ({
  id: project._id.toHexString(),
  title: project.title,
  status: project.status,
  type: project.type,
  genres: project.genres,
  summary: project.summary,
  excerpt: project.excerpt,
  pinterestUrl: project.pinterestUrl,
  playlistUrl: project.playlistUrl,
  featured: project.featured,
  awards: project.awards,
  coverUrl: project.coverVersion === null ? null : `/api/covers/${project._id.toHexString()}?v=${project.coverVersion}`,
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

const objectIdOrNull = (value: string): ObjectId | null => (ObjectId.isValid(value) ? new ObjectId(value) : null);

export type WritingRepository = ReturnType<typeof createWritingRepository>;

export const createWritingRepository = (database: Db) => {
  const { projects, goals, entries, covers } = collections(database);

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

    async createProject(userId: string, input: ProjectInput, now: Date): Promise<string> {
      const { insertedId } = await projects.insertOne({
        ...input,
        userId: new ObjectId(userId),
        awards: [],
        coverVersion: null,
        createdAt: now,
        updatedAt: now,
      });

      if (input.featured) {
        await unfeatureOthers(userId, insertedId);
      }

      return insertedId.toHexString();
    },

    async updateProject(userId: string, projectId: string, input: ProjectInput, now: Date): Promise<boolean> {
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

    async setAwards(userId: string, projectId: string, awards: string[], now: Date): Promise<boolean> {
      const filter = owned(userId, projectId);
      const result = filter ? await projects.updateOne(filter, { $set: { awards, updatedAt: now } }) : null;

      return result?.matchedCount === 1;
    },

    async removeProject(userId: string, projectId: string): Promise<boolean> {
      const filter = owned(userId, projectId);

      if (!filter) {
        return false;
      }

      const { deletedCount } = await projects.deleteOne(filter);

      if (deletedCount === 1) {
        const children = { userId: filter.userId, projectId: filter._id };
        await Promise.all([
          goals.deleteMany(children),
          entries.deleteMany(children),
          covers.deleteOne({ _id: filter._id, userId: filter.userId }),
        ]);
      }

      return deletedCount === 1;
    },

    async saveCover(userId: string, projectId: string, cover: Cover, now: Date): Promise<boolean> {
      const filter = owned(userId, projectId);
      const project = filter
        ? await projects.findOneAndUpdate(filter, { $set: { coverVersion: now.getTime(), updatedAt: now } })
        : null;

      if (!project) {
        return false;
      }

      await covers.replaceOne(
        { _id: project._id },
        {
          userId: project.userId,
          contentType: cover.contentType,
          data: new Binary(cover.data),
          updatedAt: now,
        },
        { upsert: true },
      );

      return true;
    },

    async removeCover(userId: string, projectId: string, now: Date): Promise<boolean> {
      const filter = owned(userId, projectId);
      const result = filter ? await projects.updateOne(filter, { $set: { coverVersion: null, updatedAt: now } }) : null;

      if (!filter || result?.matchedCount !== 1) {
        return false;
      }

      await covers.deleteOne({ _id: filter._id, userId: filter.userId });

      return true;
    },

    async getCover(userId: string, projectId: string): Promise<Cover | null> {
      const filter = owned(userId, projectId);
      const cover = filter ? await covers.findOne(filter) : null;

      return cover ? { contentType: cover.contentType, data: new Uint8Array(cover.data.buffer) } : null;
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

    async createGoal(userId: string, projectId: string, input: GoalInput, now: Date): Promise<string | null> {
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
  };
};
