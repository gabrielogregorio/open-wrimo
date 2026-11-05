import type { GoalChoice } from '@/components/update-form';
import { UNIT_LABELS } from '@/components/writing-labels';
import type { Notebook } from '@/server/notebook';

export const goalChoices = (notebook: Notebook): GoalChoice[] => {
  const titles = new Map(notebook.projects.map((project) => [project.id, project.title]));

  return notebook.goals
    .filter((goal) => goal.stats.state !== 'ended')
    .map((goal) => ({
      id: goal.id,
      label: `${titles.get(goal.projectId)} · ${goal.name}`,
      unitLabel: UNIT_LABELS[goal.unit],
      total: goal.stats.total,
    }));
};

export const pickGoal = (choices: GoalChoice[], wanted: string | string[] | undefined): string =>
  choices.find((choice) => choice.id === wanted)?.id ?? choices[0]?.id ?? '';
