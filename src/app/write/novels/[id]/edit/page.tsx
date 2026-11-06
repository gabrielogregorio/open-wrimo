import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import {
  createGoalInlineAction,
  deleteGoalInlineAction,
  deleteNovelAction,
  editGoalInlineAction,
  updateNovelAction,
} from '@/app/actions/writing';
import { GoalCard } from '@/components/goal-card';
import { NewGoalInline } from '@/components/new-goal-inline';
import { withStats } from '@/lib/writing/goals';
import { ConfirmDelete } from '@/components/confirm-delete';
import { NovelForm } from '@/components/novel-form';
import { getTranslator } from '@/server/i18n';
import { writingContext } from '@/server/session';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslator();

  return { title: t('Edit novel') };
}

export default async function EditNovelPage({ params, searchParams }: PageProps<'/write/novels/[id]/edit'>) {
  const { id } = await params;
  const { writing, userId, today } = await writingContext();
  const novel = await writing.getProject(userId, id);

  if (!novel) {
    notFound();
  }

  const t = await getTranslator();
  const goals = withStats(
    await writing.listGoals(userId, novel.id),
    await writing.listEntries(userId, { projectId: novel.id }),
    today,
  );
  const coverRefused = (await searchParams).cover === 'refused';

  return (
    <div className="sheet mx-auto flex max-w-2xl flex-col gap-8 rounded-sm p-8">
      <h1 className="font-display text-3xl font-semibold">{t('Edit novel')}</h1>
      <NovelForm
        action={updateNovelAction.bind(null, novel.id)}
        cancelHref={`/write/novels/${novel.id}`}
        novel={novel}
        initialError={
          coverRefused ? t('The novel was created, but the cover was refused. Try another image.') : undefined
        }
      />
      <section aria-labelledby="novel-goals" className="flex flex-col gap-4 border-t border-rule pt-6">
        <h2 id="novel-goals" className="font-display text-2xl font-semibold">
          {t('Goals of this novel')}
        </h2>
        {goals.length === 0 ? <p className="text-ink-soft italic">{t('No goals yet.')}</p> : null}
        {goals.map((goal) => (
          <div key={goal.id} className="rounded-sm border border-rule p-4">
            <GoalCard
              goal={goal}
              today={today}
              editAction={editGoalInlineAction.bind(null, novel.id, goal.id)}
              deleteAction={deleteGoalInlineAction.bind(null, goal.id)}
            />
          </div>
        ))}
        <NewGoalInline action={createGoalInlineAction.bind(null, novel.id)} today={today} defaultName={novel.title} />
      </section>
      <ConfirmDelete
        action={deleteNovelAction.bind(null, novel.id)}
        label={t('Delete this novel')}
        question={t('Delete the novel with its goals and progress?')}
        confirmLabel={t('Yes, delete it')}
      />
    </div>
  );
}
