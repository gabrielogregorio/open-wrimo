import { ObjectId, type Db } from 'mongodb';
import {
  collections,
  type ProfileSection,
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
  type GoalPeriod,
  type GoalUnit,
  type Mood,
  type PostInput,
  type ProfileInput,
  type ProjectFields,
} from './schema';

export type ProjectView = ProjectFields & {
  id: string;
  awards: string[];
  coverUrl: string | null;
  updatedAt: string;
};

export type GoalView = Omit<GoalInput, 'period'> & {
  id: string;
  projectId: string;
  eventId?: EventId | null;
  period?: GoalPeriod | null;
};

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

export type ProfileView = Omit<ProfileInput, 'name' | 'username'> & {
  avatarUrl: string | null;
  shown: Record<ProfileSection, boolean>;
};

const ALL_SHOWN: Record<ProfileSection, boolean> = { bio: true, stats: true, favorites: true, badges: true };

export const EMPTY_PROFILE: ProfileView = {
  bio: '',
  location: '',
  writingTime: '',
  favoriteBooks: '',
  favoriteAuthors: '',
  pronouns: '',
  avatarUrl: null,
  isPublic: false,
  shown: ALL_SHOWN,
};

export const COMMUNITY_SORTS = ['words', 'recent', 'name'] as const;
export type CommunitySort = (typeof COMMUNITY_SORTS)[number];
export const COMMUNITY_PAGE_SIZE = 24;

export type CommunityWriter = {
  username: string;
  name: string;
  avatarUrl: string | null;
  location: string;
  novels: number;
  words: number;
  lastWrote: string | null;
  featured: { title: string; coverUrl: string | null } | null;
};

export type CommunityPage = { writers: CommunityWriter[]; total: number };

const escapeRegex = (text: string): string => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

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
  isPublic: project.isPublic ?? false,
  wordsBefore: project.wordsBefore ?? 0,
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
  period: goal.period ?? null,
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
  const { projects, goals, entries, posts, profiles, users } = collections(database);

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

    async createProject(userId: string, input: ProjectFields, now: Date): Promise<string> {
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

    async updateProject(userId: string, projectId: string, input: ProjectFields, now: Date): Promise<boolean> {
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

    async getProfile(userId: string): Promise<ProfileView> {
      const profile = await profiles.findOne({ userId: new ObjectId(userId) });

      return profile
        ? {
            bio: profile.bio,
            location: profile.location,
            writingTime: profile.writingTime,
            favoriteBooks: profile.favoriteBooks,
            favoriteAuthors: profile.favoriteAuthors,
            pronouns: profile.pronouns ?? '',
            avatarUrl: profile.avatarUrl,
            isPublic: profile.isPublic ?? false,
            shown: { ...ALL_SHOWN, ...profile.shown },
          }
        : EMPTY_PROFILE;
    },

    async saveProfile(
      userId: string,
      { name, username, ...input }: ProfileInput,
      shown: Record<ProfileSection, boolean>,
      now: Date,
    ): Promise<boolean> {
      const owner = new ObjectId(userId);

      if (await users.findOne({ username, _id: { $ne: owner } }, { projection: { _id: 1 } })) {
        return false;
      }

      await users.updateOne({ _id: owner }, { $set: { name, username } });
      await profiles.updateOne(
        { userId: owner },
        { $set: { ...input, shown, updatedAt: now }, $setOnInsert: { avatarUrl: null, avatarKey: null } },
        { upsert: true },
      );

      return true;
    },

    async setAvatar(userId: string, image: StoredImage | null, now: Date): Promise<string | null> {
      const before = await profiles.findOneAndUpdate(
        { userId: new ObjectId(userId) },
        {
          $set: { avatarUrl: image?.url ?? null, avatarKey: image?.key ?? null, updatedAt: now },
          $setOnInsert: {
            bio: '',
            location: '',
            writingTime: '',
            favoriteBooks: '',
            favoriteAuthors: '',
            pronouns: '',
            isPublic: false,
          },
        },
        { upsert: true },
      );

      return before?.avatarKey ?? null;
    },

    async findPublicWriter(username: string): Promise<{ userId: string; name: string; username: string } | null> {
      // An account waiting for deletion is hidden from everyone at once.
      const user = await users.findOne(
        { username, deletionRequestedAt: { $exists: false } },
        { projection: { name: 1, username: 1 } },
      );

      if (!user) {
        return null;
      }

      const profile = await profiles.findOne({ userId: user._id, isPublic: true }, { projection: { _id: 1 } });

      return profile ? { userId: user._id.toHexString(), name: user.name, username: user.username } : null;
    },

    async listCommunity(options: { query: string; sort: CommunitySort; page: number }): Promise<CommunityPage> {
      const publicProfiles = await profiles
        .find({ isPublic: true }, { projection: { userId: 1, avatarUrl: 1, location: 1 } })
        .toArray();
      const profileOf = new Map(publicProfiles.map((profile) => [profile.userId.toHexString(), profile]));
      const search = options.query.trim();
      const matcher = search ? new RegExp(escapeRegex(search), 'i') : null;
      const people = await users
        .find(
          {
            _id: { $in: publicProfiles.map((profile) => profile.userId) },
            deletionRequestedAt: { $exists: false },
            ...(matcher ? { $or: [{ name: matcher }, { username: matcher }] } : {}),
          },
          { projection: { name: 1, username: 1 } },
        )
        .toArray();
      const ids = people.map((person) => person._id);
      const publicNovels = await projects
        .find(
          { userId: { $in: ids }, isPublic: true },
          { projection: { userId: 1, title: 1, coverUrl: 1, featured: 1, updatedAt: 1 } },
        )
        .sort({ featured: -1, updatedAt: -1 })
        .toArray();
      const totals = await entries
        .aggregate<{ _id: ObjectId; words: number; lastWrote: string }>([
          {
            $match: { userId: { $in: ids }, projectId: { $in: publicNovels.map((novel) => novel._id) }, unit: 'words' },
          },
          { $group: { _id: '$userId', words: { $sum: '$count' }, lastWrote: { $max: '$date' } } },
        ])
        .toArray();
      const totalOf = new Map(totals.map((total) => [total._id.toHexString(), total]));
      const writers: CommunityWriter[] = people.map((person) => {
        const id = person._id.toHexString();
        const novels = publicNovels.filter((novel) => novel.userId.equals(person._id));
        const profile = profileOf.get(id);
        const total = totalOf.get(id);

        return {
          username: person.username,
          name: person.name,
          avatarUrl: profile?.avatarUrl ?? null,
          location: profile?.location ?? '',
          novels: novels.length,
          words: total?.words ?? 0,
          lastWrote: total?.lastWrote ?? null,
          featured: novels[0] ? { title: novels[0].title, coverUrl: novels[0].coverUrl } : null,
        };
      });
      const order: Record<CommunitySort, (first: CommunityWriter, second: CommunityWriter) => number> = {
        words: (first, second) => second.words - first.words,
        recent: (first, second) => (second.lastWrote ?? '').localeCompare(first.lastWrote ?? ''),
        name: (first, second) => first.name.localeCompare(second.name, 'pt-BR'),
      };
      const sorted = writers.sort(order[options.sort]);
      const start = (options.page - 1) * COMMUNITY_PAGE_SIZE;

      return { writers: sorted.slice(start, start + COMMUNITY_PAGE_SIZE), total: sorted.length };
    },
  };
};
