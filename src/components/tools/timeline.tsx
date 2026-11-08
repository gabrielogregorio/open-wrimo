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

type TimelineEvent = { id: string; title: string; chapter: number; note: string };

const chapterOf = (value: string): number => Math.max(1, Number.parseInt(value.replace(/\D/g, ''), 10) || 1);

// Events stay in chapter order; inside a chapter they keep the order the writer gave them.
const ordered = (events: TimelineEvent[]): TimelineEvent[] =>
  [...events].sort((first, second) => first.chapter - second.chapter);

export default function Timeline({ data }: { data: ToolData }) {
  const { t } = useI18n();
  const [novelId, setNovelId] = useNovelChoice(data.novels);
  const [stored, save] = useStoryList<TimelineEvent>(novelId, 'timeline');
  const [editing, setEditing] = useState<string | null>(null);
  const events = ordered(stored);
  const fields: EntryField[] = [
    { name: 'title', label: t('What happens'), required: true },
    { name: 'chapter', label: t('Chapter'), numeric: true },
    { name: 'note', label: t('Note'), multiline: true },
  ];
  const fromValues = (id: string, values: Record<string, string>): TimelineEvent => ({
    id,
    title: values.title,
    chapter: chapterOf(values.chapter),
    note: values.note,
  });

  // Moving past a neighbor from another chapter takes that chapter, so the order and the numbers agree.
  const move = (index: number, offset: number) => {
    const target = events[index + offset];
    const moved = events.map((event) => event);
    moved[index + offset] = { ...events[index], chapter: target.chapter };
    moved[index] = target;
    save(moved);
  };

  return (
    <div className="flex flex-col gap-5">
      <NovelPicker novels={data.novels} value={novelId} onChange={setNovelId} />
      <section className={cardClasses}>
        <h2 className="font-display text-lg font-semibold">{t('New event')}</h2>
        <EntryForm
          key={novelId}
          fields={fields}
          initial={{ chapter: '1' }}
          submitLabel={t('Add event')}
          onSubmit={(values) => save([...events, fromValues(newEntryId(), values)])}
        />
      </section>
      {events.length === 0 ? <p className="text-center text-ink-soft">{t('No events yet for this novel.')}</p> : null}
      <ol className="flex flex-col gap-3 border-l-2 border-rule pl-4">
        {events.map((event, index) => (
          <li key={event.id} className={cardClasses}>
            {editing === event.id ? (
              <EntryForm
                fields={fields}
                initial={{ title: event.title, chapter: String(event.chapter), note: event.note }}
                submitLabel={t('Save changes')}
                onSubmit={(values) => {
                  save(events.map((item) => (item.id === event.id ? fromValues(item.id, values) : item)));
                  setEditing(null);
                }}
                onCancel={() => setEditing(null)}
              />
            ) : (
              <>
                <p className="font-display text-sm text-ink-soft">{t('Chapter {number}', { number: event.chapter })}</p>
                <h3 className="font-display text-lg font-semibold">{event.title}</h3>
                {event.note ? <p className="text-sm whitespace-pre-line">{event.note}</p> : null}
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={index === 0}
                    aria-label={t('Move {title} up', { title: event.title })}
                    onClick={() => move(index, -1)}
                    className={buttonClasses}>
                    ↑
                  </button>
                  <button
                    type="button"
                    disabled={index === events.length - 1}
                    aria-label={t('Move {title} down', { title: event.title })}
                    onClick={() => move(index, 1)}
                    className={buttonClasses}>
                    ↓
                  </button>
                  <button type="button" onClick={() => setEditing(event.id)} className={buttonClasses}>
                    {t('Edit')}
                  </button>
                  <ConfirmRemove
                    label={t('Delete')}
                    question={t('Delete {name}?', { name: event.title })}
                    onConfirm={() => save(events.filter((item) => item.id !== event.id))}
                  />
                </div>
              </>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}
