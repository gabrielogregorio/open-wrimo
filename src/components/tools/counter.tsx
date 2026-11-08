'use client';

import { useEffect, useState } from 'react';
import { logProgressAction } from '@/app/actions/writing';
import type { ToolData } from '@/lib/tools/data';
import type { Draft } from '@/lib/tools/drafts';
import { localDb } from '@/lib/tools/local-db';
import { countWords } from '@/lib/tools/words';
import { useI18n } from '../i18n-provider';
import { DraftBar, useDraftSession } from './write/draft-session';
import { LogWords } from './write/log-words';
import { writingArea } from './write/styles';

type Logged = Record<string, number>;

// How many words of each draft were already sent to each goal, so only the new ones go next time.
export const loggedKey = (draftId: string): string => `counter-logged:${draftId}`;

export default function Counter({ data }: { data: ToolData }) {
  const { t } = useI18n();
  const session = useDraftSession('counter', t('Counted text {date}', { date: data.today }));
  const [loggedByDraft, setLoggedByDraft] = useState<Record<string, Logged>>({});
  const draftId = session.draft?.id ?? '';
  const logged = loggedByDraft[draftId] ?? {};
  const words = countWords(session.text);

  useEffect(() => {
    if (!draftId) {
      return undefined;
    }

    void localDb()
      .get<Logged>(loggedKey(draftId))
      .then((stored) => setLoggedByDraft((previous) => ({ ...previous, [draftId]: stored ?? {} })));

    return undefined;
  }, [draftId]);

  const newWords = (goalId: string): number => Math.max(0, words - (logged[goalId] ?? 0));

  const remember = async (goalId: string, count: number): Promise<void> => {
    // There is text to log, so the session always has a draft after saving it.
    const draft = (await session.flush()) as Draft;
    const next = { ...logged, [goalId]: (logged[goalId] ?? 0) + count };
    await localDb().set(loggedKey(draft.id), next);
    setLoggedByDraft((previous) => ({ ...previous, [draft.id]: next }));
  };

  return (
    <div className="flex flex-col gap-5">
      <section className="sheet flex flex-col gap-3 rounded-sm p-4">
        <p className="font-display text-4xl font-semibold tabular-nums" aria-live="polite">
          {t('{count} words', { count: words })}
        </p>
        <textarea
          aria-label={t('Your text')}
          value={session.text}
          disabled={!session.ready}
          placeholder={t('Paste or write your text here…')}
          spellCheck
          onChange={(event) => session.setText(event.target.value)}
          className={`${writingArea} h-[50dvh]`}
        />
        <DraftBar session={session} />
      </section>
      <section className="sheet flex flex-col gap-3 rounded-sm p-4">
        <h2 className="font-display text-lg font-semibold">{t('Log to a goal')}</h2>
        <LogWords
          data={data}
          action={logProgressAction}
          countFor={newWords}
          onLogged={remember}
          buttonLabel={(count) => t('Log {count} new words', { count })}
        />
        <p className="text-sm text-ink-soft">
          {t('Only the words added since the last log to the same goal are sent.')}
        </p>
      </section>
    </div>
  );
}
