import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { AchievementWatcher, type EarnedAchievement } from '@/components/achievement-watcher';
import { GoalCelebration, type BeatenGoal } from '@/components/goal-celebration';
import { LIFETIME_BADGES, PARTICIPATION_BADGES, PERSONAL_BADGES, WRITING_BADGES } from '@/lib/writing/badges';
import { createAccountRepository } from '@/lib/account/account';
import { getDatabase } from '@/lib/db/client';
import { needsTermsAcceptance } from '@/lib/legal/terms';
import { getTranslator } from '@/server/i18n';
import { lifetimeBadges, loadNotebook, participationBadges, projectBadges } from '@/server/notebook';
import { requireUser } from '@/server/session';

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function WritingLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();
  const account = await createAccountRepository(await getDatabase()).status(user.id);

  // An account waiting for deletion goes to its account page to cancel; new terms are shown before writing.
  if (account?.deletionRequestedAt) {
    redirect('/conta');
  }

  if (needsTermsAcceptance(account?.termsVersion)) {
    redirect('/termos/aceitar');
  }

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

  const lifetime = lifetimeBadges(notebook);

  for (const badge of LIFETIME_BADGES.filter((item) => lifetime.has(item.id))) {
    earned.push({
      key: `all:${badge.id}`,
      kind: 'writing',
      badge,
      label: label(badge.label, badge.mark),
      novel: t('All novels'),
    });
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

  const titles = new Map(notebook.projects.map((project) => [project.id, project.title]));
  const beaten: BeatenGoal[] = notebook.goals
    .filter((goal) => goal.stats.reached)
    .map((goal) => ({
      key: `${goal.id}:${goal.stats.daily[0]?.date ?? goal.startDate}`,
      name: goal.name,
      novel: titles.get(goal.projectId) ?? '',
      percent: Math.floor((goal.stats.total / goal.target) * 100),
    }));

  return (
    <>
      {children}
      <GoalCelebration beaten={beaten} />
      <AchievementWatcher earned={earned} />
    </>
  );
}
