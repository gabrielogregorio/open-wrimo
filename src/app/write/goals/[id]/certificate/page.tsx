import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { LogoMark } from '@/components/logo';
import { UNIT_LABELS } from '@/components/writing-labels';
import { formatDay, formatNumber } from '@/lib/i18n/format';
import { getLocale, getTranslator } from '@/server/i18n';
import { loadNotebook } from '@/server/notebook';
import { requireUser } from '@/server/session';
import { PrintButton } from './print-button';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslator();

  return { title: t('Certificate') };
}

export default async function CertificatePage({ params }: PageProps<'/write/goals/[id]/certificate'>) {
  const { id } = await params;
  const user = await requireUser();
  const notebook = await loadNotebook();
  const goal = notebook.goals.find((item) => item.id === id);
  const novel = notebook.projects.find((project) => project.id === goal?.projectId);

  if (!goal || !novel || !goal.stats.reached) {
    notFound();
  }

  const t = await getTranslator();
  const locale = await getLocale();

  return (
    <div className="flex flex-col items-center gap-6">
      <section className="certificate sheet relative flex w-full max-w-3xl flex-col items-center gap-5 rounded-sm border-4 border-double border-accent p-12 text-center">
        <LogoMark className="h-16 w-16 text-accent" />
        <p className="font-display text-sm tracking-[0.4em] text-accent uppercase">{t('Certificate of victory')}</p>
        <h1 className="font-display text-5xl font-semibold">{user.name}</h1>
        <p className="max-w-xl text-lg">
          {t('wrote {count} {unit} of {title} and met the goal {goal} on {date}.', {
            count: formatNumber(locale, goal.stats.total),
            unit: t(UNIT_LABELS[goal.unit]),
            title: novel.title,
            goal: goal.name,
            date: formatDay(locale, goal.stats.reachedOn!),
          })}
        </p>
        <p className="font-display text-xl text-accent italic">{t('Open Wrimo · write every day, read slowly.')}</p>
      </section>
      <PrintButton label={t('Print or save as PDF')} />
    </div>
  );
}
