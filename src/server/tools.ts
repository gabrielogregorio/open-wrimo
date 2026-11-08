import type { ToolData } from '@/lib/tools/data';
import { sumByDate } from '@/lib/writing/stats';
import { type Notebook, wordsFor } from './notebook';

export const toolData = (notebook: Notebook): ToolData => {
  const words = notebook.entries.filter((entry) => entry.unit === 'words');

  return {
    today: notebook.today,
    novels: notebook.projects.map((project) => ({
      id: project.id,
      title: project.title,
      totalWords: wordsFor(notebook, project.id),
      goals: notebook.goals
        .filter((goal) => goal.projectId === project.id && goal.unit === 'words' && goal.stats.state !== 'ended')
        .map((goal) => ({
          id: goal.id,
          name: goal.name,
          target: goal.target,
          total: goal.stats.total,
          startDate: goal.stats.daily[0]?.date ?? goal.startDate,
          endDate: goal.stats.daily.at(-1)?.date ?? goal.endDate,
        })),
    })),
    wordsByDay: [...sumByDate(words).entries()]
      .map(([date, count]) => ({ date, count }))
      .sort((first, second) => first.date.localeCompare(second.date)),
  };
};
