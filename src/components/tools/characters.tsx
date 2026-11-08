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

type Character = {
  id: string;
  name: string;
  role: string;
  appearance: string;
  goal: string;
  fear: string;
  arc: string;
  notes: string;
};

const DETAILS = ['appearance', 'goal', 'fear', 'arc', 'notes'] as const;

export default function Characters({ data }: { data: ToolData }) {
  const { t } = useI18n();
  const [novelId, setNovelId] = useNovelChoice(data.novels);
  const [characters, save] = useStoryList<Character>(novelId, 'characters');
  const [editing, setEditing] = useState<string | null>(null);
  const titles: Record<(typeof DETAILS)[number], string> = {
    appearance: t('Appearance'),
    goal: t('What they want'),
    fear: t('Fear'),
    arc: t('Arc'),
    notes: t('Notes'),
  };
  const fields: EntryField[] = [
    { name: 'name', label: t('Name'), required: true },
    { name: 'role', label: t('Role in the story') },
    ...DETAILS.map((detail) => ({ name: detail, label: titles[detail], multiline: true })),
  ];
  const valuesOf = (character: Character): Record<string, string> => ({ ...character });
  const fromValues = (id: string, values: Record<string, string>): Character => ({
    id,
    name: values.name,
    role: values.role,
    appearance: values.appearance,
    goal: values.goal,
    fear: values.fear,
    arc: values.arc,
    notes: values.notes,
  });

  return (
    <div className="flex flex-col gap-5">
      <NovelPicker novels={data.novels} value={novelId} onChange={setNovelId} />
      <section className={cardClasses}>
        <h2 className="font-display text-lg font-semibold">{t('New character')}</h2>
        <EntryForm
          key={novelId}
          fields={fields}
          submitLabel={t('Add character')}
          onSubmit={(values) => save([...characters, fromValues(newEntryId(), values)])}
        />
      </section>
      {characters.length === 0 ? (
        <p className="text-center text-ink-soft">{t('No characters yet for this novel.')}</p>
      ) : null}
      <ul className="grid gap-4 sm:grid-cols-2">
        {characters.map((character) => (
          <li key={character.id} className={cardClasses}>
            {editing === character.id ? (
              <EntryForm
                fields={fields}
                initial={valuesOf(character)}
                submitLabel={t('Save changes')}
                onSubmit={(values) => {
                  save(characters.map((item) => (item.id === character.id ? fromValues(item.id, values) : item)));
                  setEditing(null);
                }}
                onCancel={() => setEditing(null)}
              />
            ) : (
              <>
                <h3 className="font-display text-xl font-semibold">{character.name}</h3>
                {character.role ? <p className="text-sm text-ink-soft">{character.role}</p> : null}
                <dl className="flex flex-col gap-1 text-sm">
                  {DETAILS.filter((detail) => character[detail]).map((detail) => (
                    <div key={detail}>
                      <dt className="font-display font-semibold">{titles[detail]}</dt>
                      <dd className="whitespace-pre-line">{character[detail]}</dd>
                    </div>
                  ))}
                </dl>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => setEditing(character.id)} className={buttonClasses}>
                    {t('Edit')}
                  </button>
                  <ConfirmRemove
                    label={t('Delete')}
                    question={t('Delete {name}?', { name: character.name })}
                    onConfirm={() => save(characters.filter((item) => item.id !== character.id))}
                  />
                </div>
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
