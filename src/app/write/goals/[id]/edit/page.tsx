import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { deleteGoalAction, saveGoalAction } from '@/app/actions/writing';
import { ConfirmDelete } from '@/components/confirm-delete';
import { GoalForm } from '@/components/goal-form';
import { getTranslator } from '@/server/i18n';
import { writingContext } from '@/server/session';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslator();

  return { title: t('Edit goal') };
}

export default async function EditGoalPage({ params }: PageProps<'/write/goals/[id]/edit'>) {
  const { id } = await params;
  const { writing, userId, today } = await writingContext();
  const goal = await writing.getGoal(userId, id);

  if (!goal) {
    notFound();
  }

  const t = await getTranslator();

  return (
    <div className="sheet mx-auto flex max-w-2xl flex-col gap-8 rounded-sm p-8">
      <h1 className="font-display text-3xl font-semibold">{t('Edit goal')}</h1>
      <GoalForm
        action={saveGoalAction.bind(null, goal.projectId, goal.id)}
        cancelHref={`/write/novels/${goal.projectId}?tab=goals`}
        today={today}
        defaultName={goal.name}
        goal={goal}
      />
      <ConfirmDelete
        action={deleteGoalAction.bind(null, goal.projectId, goal.id)}
        label={t('Delete this goal')}
        question={t('Delete the goal? The words you logged stay on the novel.')}
        confirmLabel={t('Yes, delete it')}
      />
    </div>
  );
}
