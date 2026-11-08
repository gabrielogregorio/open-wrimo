'use client';

import { useState } from 'react';
import { useI18n } from '@/components/i18n-provider';
import type { ToolData } from '@/lib/tools/data';
import { newEntryId } from '@/lib/tools/story/random';
import {
  ConfirmRemove,
  EntryForm,
  NovelPicker,
  buttonClasses,
  cardClasses,
  useNovelChoice,
  useStoryList,
  type EntryField,
} from './story/story-ui';

// The open tab gets its own classes: appending bg-accent to buttonClasses would lose to its bg-paper.
const activeTabClasses =
  'inline-flex min-h-11 min-w-11 items-center justify-center rounded-sm border border-accent bg-accent px-3 text-sm text-accent-ink';

const COLUMNS = ['planned', 'written', 'revised'] as const;

type Column = (typeof COLUMNS)[number];

type Scene = { id: string; title: string; note: string; column: Column };

const COLUMN_LABELS: Record<Column, string> = { planned: 'Planned', written: 'Written', revised: 'Revised' };

export default function Scenes({ data }: { data: ToolData }) {
  const { t } = useI18n();
  const [novelId, setNovelId] = useNovelChoice(data.novels);
  const [scenes, save] = useStoryList<Scene>(novelId, 'scenes');
  const [shown, setShown] = useState<Column>('planned');
  const fields: EntryField[] = [
    { name: 'title', label: t('Scene'), required: true },
    { name: 'note', label: t('Note'), multiline: true },
  ];
  const moveTo = (scene: Scene, column: Column) =>
    save(scenes.map((item) => (item.id === scene.id ? { ...item, column } : item)));
  const countIn = (column: Column) => scenes.filter((scene) => scene.column === column).length;

  return (
    <div className="flex flex-col gap-5">
      <NovelPicker novels={data.novels} value={novelId} onChange={setNovelId} />
      <section className={cardClasses}>
        <h2 className="font-display text-lg font-semibold">{t('New scene')}</h2>
        <EntryForm
          key={novelId}
          fields={fields}
          submitLabel={t('Add to planned')}
          onSubmit={(values) =>
            save([...scenes, { id: newEntryId(), title: values.title, note: values.note, column: 'planned' }])
          }
        />
      </section>
      <div role="tablist" aria-label={t('Columns')} className="grid grid-cols-3 gap-1 md:hidden">
        {COLUMNS.map((column) => (
          <button
            key={column}
            type="button"
            role="tab"
            aria-selected={shown === column}
            onClick={() => setShown(column)}
            className={shown === column ? activeTabClasses : buttonClasses}>
            {t(COLUMN_LABELS[column])} ({countIn(column)})
          </button>
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {COLUMNS.map((column, columnIndex) => (
          <section
            key={column}
            aria-label={t(COLUMN_LABELS[column])}
            className={`flex-col gap-3 rounded-sm border border-dashed border-rule p-2 md:flex ${shown === column ? 'flex' : 'hidden'}`}>
            <h2 className="hidden font-display text-lg font-semibold md:block">
              {t(COLUMN_LABELS[column])} ({countIn(column)})
            </h2>
            {scenes
              .filter((scene) => scene.column === column)
              .map((scene) => (
                <article key={scene.id} className={cardClasses}>
                  <h3 className="font-display font-semibold">{scene.title}</h3>
                  {scene.note ? <p className="text-sm whitespace-pre-line">{scene.note}</p> : null}
                  <div className="flex flex-wrap gap-2">
                    {columnIndex > 0 ? (
                      <button
                        type="button"
                        onClick={() => moveTo(scene, COLUMNS[columnIndex - 1])}
                        className={buttonClasses}>
                        ← {t(COLUMN_LABELS[COLUMNS[columnIndex - 1]])}
                      </button>
                    ) : null}
                    {columnIndex < COLUMNS.length - 1 ? (
                      <button
                        type="button"
                        onClick={() => moveTo(scene, COLUMNS[columnIndex + 1])}
                        className={buttonClasses}>
                        {t(COLUMN_LABELS[COLUMNS[columnIndex + 1]])} →
                      </button>
                    ) : null}
                    <ConfirmRemove
                      label={t('Delete')}
                      question={t('Delete {name}?', { name: scene.title })}
                      onConfirm={() => save(scenes.filter((item) => item.id !== scene.id))}
                    />
                  </div>
                </article>
              ))}
          </section>
        ))}
      </div>
    </div>
  );
}
