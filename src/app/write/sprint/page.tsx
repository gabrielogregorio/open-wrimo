import type { Metadata } from 'next';
import { logSprintAction } from '@/app/actions/writing';
import { SprintTimer } from '@/components/sprint-timer';
import { getTranslator } from '@/server/i18n';
import { loadNotebook } from '@/server/notebook';
import { bookChoices, pickGoal } from '../goal-choices';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslator();

  return { title: t('Writing sprint') };
}

export default async function SprintPage() {
  const notebook = await loadNotebook();
  const t = await getTranslator();
  const choices = bookChoices(notebook, t);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <h1 className="font-display text-4xl font-semibold">{t('Writing sprint')}</h1>
      <p className="text-ink-soft">{t('Pick a time, write without stopping, then log what you wrote.')}</p>
      <SprintTimer
        action={logSprintAction}
        books={choices}
        selectedGoal={pickGoal(choices, undefined)}
        today={notebook.today}
      />
    </div>
  );
}
