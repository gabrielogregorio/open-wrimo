'use client';

import { useEffect, useRef, useState } from 'react';
import { logSprintAction } from '@/app/actions/writing';
import type { ToolData } from '@/lib/tools/data';
import { countWords } from '@/lib/tools/words';
import { playAlarmRing } from '../alarm-sound';
import { useI18n } from '../i18n-provider';
import { clockText } from '../sprint-timer';
import { DraftBar, useDraftSession } from './write/draft-session';
import { LogWords } from './write/log-words';
import { primaryButton, quietButton, writingArea } from './write/styles';

const PRESETS = [5, 10, 15, 20, 25, 30];

type Phase = 'idle' | 'running' | 'paused' | 'done';

export default function SprintText({ data }: { data: ToolData }) {
  const { t } = useI18n();
  const session = useDraftSession('sprint-text', t('Sprint {date}', { date: data.today }));
  const [minutes, setMinutes] = useState(15);
  const [phase, setPhase] = useState<Phase>('idle');
  const [elapsed, setElapsed] = useState(0);
  const startedAt = useRef(0);
  const carried = useRef(0);
  const total = minutes * 60;
  const words = countWords(session.text);
  const sprintWords = phase === 'idle' ? 0 : Math.max(0, words - session.baseline);

  useEffect(() => {
    if (phase !== 'running') {
      return undefined;
    }

    const tick = (): void => {
      const seconds = carried.current + (Date.now() - startedAt.current) / 1000;
      setElapsed(Math.min(seconds, total));

      if (seconds >= total) {
        setPhase('done');
        void playAlarmRing();
      }
    };
    const interval = window.setInterval(tick, 250);

    return () => window.clearInterval(interval);
  }, [phase, total]);

  const start = (): void => {
    if (phase === 'idle') {
      session.setBaseline(words);
    }

    startedAt.current = Date.now();
    setPhase('running');
  };

  const pause = (): void => {
    carried.current = elapsed;
    setPhase('paused');
  };

  const reset = (): void => {
    carried.current = 0;
    setElapsed(0);
    setPhase('idle');
  };

  return (
    <div className="flex flex-col gap-5">
      <section className="sheet flex flex-col gap-3 rounded-sm p-4">
        <div className="flex flex-wrap gap-2" role="group" aria-label={t('Minutes')}>
          {PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              disabled={phase !== 'idle'}
              aria-pressed={minutes === preset}
              onClick={() => setMinutes(preset)}
              className={`min-h-11 min-w-11 rounded-sm border px-3 text-sm ${minutes === preset ? 'border-accent text-accent' : 'border-rule'}`}>
              {t('{count} min', { count: preset })}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <p className="font-display text-4xl font-semibold tabular-nums" role="timer">
            {clockText(total - elapsed)}
          </p>
          <p className="font-display text-sm tabular-nums" aria-live="polite">
            {t('{count} words in this sprint', { count: sprintWords })}
          </p>
          <span className="flex-1" />
          {phase === 'running' ? (
            <button type="button" onClick={pause} className={quietButton}>
              {t('Pause')}
            </button>
          ) : null}
          {phase === 'idle' || phase === 'paused' ? (
            <button type="button" onClick={start} className={primaryButton}>
              {phase === 'idle' ? t('Start') : t('Resume')}
            </button>
          ) : null}
          {phase === 'running' || phase === 'paused' ? (
            <button type="button" onClick={() => setPhase('done')} className={quietButton}>
              {t('Finish')}
            </button>
          ) : null}
          {phase === 'done' ? (
            <button type="button" onClick={reset} className={quietButton}>
              {t('Start over')}
            </button>
          ) : null}
        </div>
        <textarea
          aria-label={t('Your text')}
          value={session.text}
          disabled={!session.ready}
          placeholder={t('Press start and write…')}
          spellCheck
          onChange={(event) => session.setText(event.target.value)}
          className={`${writingArea} h-[50dvh]`}
        />
        <DraftBar session={session} />
      </section>
      {phase === 'done' ? (
        <section className="sheet flex flex-col gap-3 rounded-sm p-4">
          <h2 role="status" className="font-display text-lg font-semibold text-accent">
            {t('Pens down! You wrote {count} words.', { count: sprintWords })}
          </h2>
          <LogWords
            data={data}
            action={logSprintAction}
            countFor={() => sprintWords}
            onLogged={(_goalId, count) => session.setBaseline(session.baseline + count)}
            buttonLabel={(count) => t('Log {count} words', { count })}
          />
        </section>
      ) : null}
    </div>
  );
}
