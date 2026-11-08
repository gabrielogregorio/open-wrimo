import { cache } from 'react';
import {
  LIFETIME_BADGES,
  PARTICIPATION_BADGES,
  PERSONAL_BADGES,
  WRITING_BADGES,
  earnedLifetimeBadges,
  earnedParticipationBadges,
  earnedWritingBadges,
  laurels,
} from '@/lib/writing/badges';
import { withStats } from '@/lib/writing/goals';
import { writingContext } from './session';

export const loadNotebook = cache(async () => {
  const context = await writingContext();
  const { writing, userId, today } = context;
  const [projects, goals, entries, posts] = await Promise.all([
    writing.listProjects(userId),
    writing.listGoals(userId),
    writing.listEntries(userId),
    writing.listPosts(userId),
  ]);

  return { context, today, projects, goals: withStats(goals, entries, today), entries, postCount: posts.length };
});

export type Notebook = Awaited<ReturnType<typeof loadNotebook>>;

export const projectBadges = (notebook: Notebook, projectId: string): Set<string> =>
  earnedWritingBadges(
    {
      goals: notebook.goals.filter((goal) => goal.projectId === projectId),
      entries: notebook.entries.filter((entry) => entry.projectId === projectId),
    },
    notebook.today,
  );

export const allEarnedBadges = (notebook: Notebook): string[] => {
  const earned = new Set<string>();

  for (const project of notebook.projects) {
    projectBadges(notebook, project.id).forEach((id) => earned.add(`${project.id}:${id}`));
    project.awards.forEach((id) => earned.add(`${project.id}:${id}`));
  }

  return [...earned];
};

export const participationBadges = (notebook: Notebook): Set<string> =>
  earnedParticipationBadges({ projects: notebook.projects, goals: notebook.goals });

export const badgeById = new Map(
  [...WRITING_BADGES, ...LIFETIME_BADGES, ...PERSONAL_BADGES, ...PARTICIPATION_BADGES].map((badge) => [
    badge.id,
    badge,
  ]),
);

export const laurelCount = (notebook: Notebook): number => laurels(notebook.goals, notebook.entries, notebook.today);

// A novel's total is what was logged here plus the words written before it was tracked.
export const wordsFor = (notebook: Notebook, projectId: string): number =>
  (notebook.projects.find((project) => project.id === projectId)?.wordsBefore ?? 0) +
  notebook.entries
    .filter((entry) => entry.projectId === projectId && entry.unit === 'words')
    .reduce((sum, entry) => sum + entry.count, 0);

export const lifetimeWords = (notebook: Notebook): number =>
  notebook.projects.reduce((sum, project) => sum + project.wordsBefore, 0) +
  notebook.entries.filter((entry) => entry.unit === 'words').reduce((sum, entry) => sum + entry.count, 0);

export const lifetimeBadges = (notebook: Notebook): Set<string> => earnedLifetimeBadges(lifetimeWords(notebook));
