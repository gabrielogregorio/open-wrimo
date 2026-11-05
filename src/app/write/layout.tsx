import type { ReactNode } from 'react';
import { AchievementWatcher, type EarnedAchievement } from '@/components/achievement-watcher';
import { PARTICIPATION_BADGES, PERSONAL_BADGES, WRITING_BADGES } from '@/lib/writing/badges';
import { getTranslator } from '@/server/i18n';
import { loadNotebook, participationBadges, projectBadges } from '@/server/notebook';

export default async function WritingLayout({ children }: { children: ReactNode }) {
  const notebook = await loadNotebook();
  const t = await getTranslator();
  const label = (text: string, mark?: string): string => t(text, { count: mark ?? '' });
  const earned: EarnedAchievement[] = [];

  for (const project of notebook.projects) {
    const writing = projectBadges(notebook, project.id);

    for (const badge of WRITING_BADGES.filter((item) => writing.has(item.id))) {
      earned.push({
        key: `${project.id}:${badge.id}`,
        kind: 'writing',
        badge,
        label: label(badge.label, badge.mark),
        novel: project.title,
      });
    }

    for (const badge of PERSONAL_BADGES.filter((item) => project.awards.includes(item.id))) {
      earned.push({
        key: `${project.id}:${badge.id}`,
        kind: 'personal',
        badge,
        label: t(badge.label),
        novel: project.title,
      });
    }
  }

  const participation = participationBadges(notebook);

  for (const badge of PARTICIPATION_BADGES.filter((item) => participation.has(item.id))) {
    earned.push({
      key: `all:${badge.id}`,
      kind: 'participation',
      badge,
      label: t(badge.label),
      novel: t(badge.description),
    });
  }

  return (
    <>
      {children}
      <AchievementWatcher earned={earned} />
    </>
  );
}
