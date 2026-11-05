import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { saveGoalAction } from '@/app/actions/writing';
import { GoalForm } from '@/components/goal-form';
import { getTranslator } from '@/server/i18n';
import { writingContext } from '@/server/session';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslator();

  return { title: t('Create new goal') };
}

export default async function NewGoalPage({ params }: PageProps<'/write/novels/[id]/goals/new'>) {
  const { id } = await params;
  const { writing, userId, today } = await writingContext();
  const novel = await writing.getProject(userId, id);

  if (!novel) {
    notFound();
  }

  const t = await getTranslator();

  return (
    <div className="sheet mx-auto max-w-2xl rounded-sm p-8">
      <h1 className="mb-6 font-display text-3xl font-semibold">{t('Create new goal')}</h1>
      <GoalForm
        action={saveGoalAction.bind(null, novel.id, undefined)}
        cancelHref={`/write/novels/${novel.id}?tab=goals`}
        today={today}
        defaultName={novel.title}
      />
    </div>
  );
}
