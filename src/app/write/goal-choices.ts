import type { BookChoice } from '@/components/update-form';
import { PROJECT_STATUS_LABELS, UNIT_LABELS } from '@/components/writing-labels';
import { formatNumber, formatShortDay } from '@/lib/i18n/format';
import type { Translate } from '@/lib/i18n/translate';
import type { Notebook } from '@/server/notebook';

export const bookChoices = (notebook: Notebook, t: Translate): BookChoice[] => {
  const lastActivity = (projectId: string, fallback: string): string =>
    notebook.entries.find((entry) => entry.projectId === projectId)?.createdAt ?? fallback;

  return notebook.projects
    .map((project) => ({
      projectId: project.id,
      title: project.title,
      coverUrl: project.coverUrl,
      statusLabel: t(PROJECT_STATUS_LABELS[project.status]),
      completed: project.status === 'completed',
      activity: lastActivity(project.id, project.updatedAt),
      goals: notebook.goals
        .filter((goal) => goal.projectId === project.id && goal.stats.state !== 'ended')
        .map((goal) => ({
          id: goal.id,
          label: goal.name,
          detail: t('{target} {unit} by {date}', {
            target: formatNumber('pt-BR', goal.target),
            unit: t(UNIT_LABELS[goal.unit]),
            date: formatShortDay('pt-BR', goal.stats.daily.at(-1)?.date ?? goal.endDate),
          }),
          unitLabel: UNIT_LABELS[goal.unit],
          total: goal.stats.total,
        })),
    }))
    .filter((book) => book.goals.length > 0)
    .sort(
      (first, second) =>
        Number(first.completed) - Number(second.completed) || second.activity.localeCompare(first.activity),
    )
    .map(({ completed: _completed, activity: _activity, ...book }) => book);
};

export const pickGoal = (books: BookChoice[], wanted: string | string[] | undefined): string => {
  const goals = books.flatMap((book) => book.goals);

  return goals.find((goal) => goal.id === wanted)?.id ?? goals[0]?.id ?? '';
};
