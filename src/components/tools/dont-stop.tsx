'use client';

import { useEffect, useRef, useState } from 'react';
import { logProgressAction } from '@/app/actions/writing';
import type { ToolData } from '@/lib/tools/data';
import { countWords } from '@/lib/tools/words';
import { useI18n } from '../i18n-provider';
import { DraftBar, useDraftSession } from './write/draft-session';
import { LogWords } from './write/log-words';
import { primaryButton, quietButton, writingArea } from './write/styles';

const PAUSES = [5, 10, 20];
const RAMP_SECONDS = 10;
const MAX_OPACITY = 0.55;

// How red the page is after a pause: nothing until the limit, then deeper over the next ten seconds.
export const rednessAfter = (idleSeconds: number, limitSeconds: number): number =>
  Math.min(1, Math.max(0, (idleSeconds - limitSeconds) / RAMP_SECONDS));

export default function DontStop({ data }: { data: ToolData }) {
  const { t } = useI18n();
  const session = useDraftSession('dont-stop', t('Don’t stop {date}', { date: data.today }));
  const [limit, setLimit] = useState(10);
  const [writing, setWriting] = useState(false);
  const [finished, setFinished] = useState(false);
  const [redness, setRedness] = useState(0);
  const lastTyped = useRef(0);
  const sessionWords = Math.max(0, countWords(session.text) - session.baseline);
  const watching = writing && !finished;

  useEffect(() => {
    if (!watching) {
      return undefined;
    }

    const interval = window.setInterval(() => {
      setRedness(rednessAfter((Date.now() - lastTyped.current) / 1000, limit));
    }, 250);

    return () => window.clearInterval(interval);
  }, [watching, limit]);

  const onType = (text: string): void => {
    session.setText(text);
    lastTyped.current = Date.now();
    setRedness(0);
    setWriting(true);
  };

  const finish = (): void => {
    setFinished(true);
    setRedness(0);
  };

  return (
    <div className="flex flex-col gap-5">
      <div
        aria-hidden="true"
        data-testid="dont-stop-tint"
        className="pointer-events-none fixed inset-0 z-40 bg-danger transition-opacity duration-300"
        style={{ opacity: redness * MAX_OPACITY }}
      />
      <section className="sheet relative z-50 flex flex-col gap-3 rounded-sm p-4">
        <div
          className="flex flex-wrap items-center gap-2"
          role="group"
          aria-label={t('Seconds before the page turns red')}>
          <span className="font-display text-sm">{t('Seconds before the page turns red')}</span>
          {PAUSES.map((pause) => (
            <button
              key={pause}
              type="button"
              aria-pressed={limit === pause}
              onClick={() => setLimit(pause)}
              className={`min-h-11 min-w-11 rounded-sm border px-3 text-sm ${limit === pause ? 'border-accent text-accent' : 'border-rule'}`}>
              {t('{count} s', { count: pause })}
            </button>
          ))}
        </div>
        <p className="font-display text-sm tabular-nums" aria-live="polite">
          {redness > 0 ? t('Keep going!') : t('{count} words in this session', { count: sessionWords })}
        </p>
        <textarea
          aria-label={t('Your text')}
          value={session.text}
          disabled={!session.ready}
          placeholder={t('Start typing and do not stop…')}
          spellCheck
          onChange={(event) => onType(event.target.value)}
          className={`${writingArea} h-[50dvh]`}
        />
        <div className="flex flex-wrap gap-2">
          {finished ? (
            <button type="button" className={quietButton} onClick={() => setFinished(false)}>
              {t('Keep writing')}
            </button>
          ) : (
            <button type="button" className={primaryButton} onClick={finish} disabled={!writing}>
              {t('Finish')}
            </button>
          )}
        </div>
        <DraftBar session={session} />
      </section>
      {finished ? (
        <section className="sheet relative z-50 flex flex-col gap-3 rounded-sm p-4">
          <h2 className="font-display text-lg font-semibold">
            {t('{count} words in this session', { count: sessionWords })}
          </h2>
          <LogWords
            data={data}
            action={logProgressAction}
            countFor={() => sessionWords}
            onLogged={(_goalId, count) => session.setBaseline(session.baseline + count)}
            buttonLabel={(count) => t('Log {count} words', { count })}
          />
        </section>
      ) : null}
    </div>
  );
}
