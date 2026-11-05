import { cache } from 'react';
import {
  PARTICIPATION_BADGES,
  PERSONAL_BADGES,
  WRITING_BADGES,
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
  earnedParticipationBadges({ projects: notebook.projects, goals: notebook.goals, posts: notebook.postCount });

export const badgeById = new Map(
  [...WRITING_BADGES, ...PERSONAL_BADGES, ...PARTICIPATION_BADGES].map((badge) => [badge.id, badge]),
);

export const laurelCount = (notebook: Notebook): number => laurels(notebook.goals, notebook.entries, notebook.today);
