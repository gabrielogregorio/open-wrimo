import type { Metadata } from 'next';
import Link from 'next/link';
import { logProgressAction, removeEntryAction } from '@/app/actions/writing';
import { SubmitButton } from '@/components/submit-button';
import { UpdateForm } from '@/components/update-form';
import { MOOD_LABELS, UNIT_LABELS } from '@/components/writing-labels';
import { formatDay, formatNumber } from '@/lib/i18n/format';
import { getLocale, getTranslator } from '@/server/i18n';
import { loadNotebook } from '@/server/notebook';
import { bookChoices, pickGoal } from '../goal-choices';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslator();

  return { title: t('Update my word count') };
}

const RECENT_ENTRIES = 15;

export default async function UpdatePage({ searchParams }: PageProps<'/write/update'>) {
  const notebook = await loadNotebook();
  const t = await getTranslator();
  const locale = await getLocale();
  const choices = bookChoices(notebook, t);
  const selected = pickGoal(choices, (await searchParams).goal);
  const titles = new Map(notebook.projects.map((project) => [project.id, project.title]));
  const recent = notebook.entries.slice(0, RECENT_ENTRIES);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8">
      <h1 className="font-display text-4xl font-semibold">{t('Update my word count')}</h1>
      {choices.length > 0 ? (
        <div className="sheet rounded-sm p-8">
          <UpdateForm action={logProgressAction} books={choices} selectedGoal={selected} today={notebook.today} />
        </div>
      ) : (
        <p className="sheet rounded-sm p-8 text-center">
          {t('You need a goal in progress to log words.')}{' '}
          <Link href="/write" className="text-accent underline underline-offset-4">
            {t('Go to the writing desk')}
          </Link>
        </p>
      )}
      <section aria-labelledby="recent-updates" className="flex flex-col gap-3">
        <h2 id="recent-updates" className="ornament font-display text-lg">
          {t('Recent updates')}
        </h2>
        {recent.length === 0 ? <p className="text-center text-ink-soft italic">{t('Nothing logged yet.')}</p> : null}
        <ul className="flex flex-col gap-2">
          {recent.map((entry) => (
            <li key={entry.id} className="sheet flex flex-wrap items-center justify-between gap-3 rounded-sm px-4 py-3">
              <span>
                <span className="font-display font-semibold">
                  {entry.count > 0 ? '+' : ''}
                  {formatNumber(locale, entry.count)} {t(UNIT_LABELS[entry.unit])}
                </span>{' '}
                <span className="text-sm text-ink-soft">
                  {titles.get(entry.projectId)} · {formatDay(locale, entry.date)}
                  {entry.source === 'sprint' ? ` · ${t('sprint')}` : ''}
                  {entry.mood ? ` · ${t(MOOD_LABELS[entry.mood])}` : ''}
                  {entry.place ? ` · ${entry.place}` : ''}
                </span>
              </span>
              <form action={removeEntryAction.bind(null, entry.id)}>
                <SubmitButton variant="quiet">{t('Undo')}</SubmitButton>
              </form>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
