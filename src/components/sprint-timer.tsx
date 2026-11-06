'use client';

import { useEffect, useRef, useState } from 'react';
import type { FormState } from '@/lib/form';
import { playAlarmRing } from './alarm-sound';
import { useI18n } from './i18n-provider';
import { UpdateForm, type BookChoice } from './update-form';

const PRESETS = [5, 10, 15, 20, 25, 30, 45, 60];

type SprintTimerProps = {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  books: BookChoice[];
  selectedGoal: string;
  today: string;
};

type Phase = 'idle' | 'running' | 'paused' | 'done';

export const clockText = (seconds: number): string => {
  const whole = Math.max(0, Math.round(seconds));
  const hours = Math.floor(whole / 3600);
  const minutes = String(Math.floor((whole % 3600) / 60)).padStart(2, '0');
  const rest = String(whole % 60).padStart(2, '0');

  return hours > 0 ? `${hours}:${minutes}:${rest}` : `${minutes}:${rest}`;
};

export function SprintTimer({ action, books, selectedGoal, today }: SprintTimerProps) {
  const { t } = useI18n();
  const [kind, setKind] = useState<'timer' | 'stopwatch'>('timer');
  const [minutes, setMinutes] = useState(15);
  const [phase, setPhase] = useState<Phase>('idle');
  const [elapsed, setElapsed] = useState(0);
  const startedAt = useRef(0);
  const carried = useRef(0);
  const total = minutes * 60;

  useEffect(() => {
    if (phase !== 'running') {
      return undefined;
    }

    const tick = (): void => {
      const seconds = carried.current + (Date.now() - startedAt.current) / 1000;
      setElapsed(seconds);

      if (kind === 'timer' && seconds >= total) {
        setPhase('done');
        void playAlarmRing();
      }
    };
    const interval = window.setInterval(tick, 250);

    return () => window.clearInterval(interval);
  }, [phase, kind, total]);

  const start = (): void => {
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

  const shown = kind === 'timer' ? total - elapsed : elapsed;
  const buttonClass = 'rounded-sm border border-rule px-4 py-2 font-display text-sm hover:bg-paper';

  return (
    <div className="flex flex-col gap-6">
      <div className="sheet flex flex-col items-center gap-5 rounded-sm p-8">
        <div role="radiogroup" aria-label={t('Kind of sprint')} className="flex gap-2 font-display text-sm">
          {(['timer', 'stopwatch'] as const).map((option) => (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={kind === option}
              disabled={phase === 'running'}
              onClick={() => {
                setKind(option);
                reset();
              }}
              className={`rounded-full border px-4 py-1.5 ${kind === option ? 'border-accent bg-accent text-accent-ink' : 'border-rule'}`}>
              {option === 'timer' ? t('Timer') : t('Stopwatch')}
            </button>
          ))}
        </div>
        {kind === 'timer' ? (
          <div className="flex flex-wrap justify-center gap-2" aria-label={t('Minutes')} role="group">
            {PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                disabled={phase !== 'idle'}
                aria-pressed={minutes === preset}
                onClick={() => setMinutes(preset)}
                className={`rounded-sm border px-3 py-1 text-sm ${minutes === preset ? 'border-accent text-accent' : 'border-rule'}`}>
                {t('{count} min', { count: preset })}
              </button>
            ))}
          </div>
        ) : null}
        <svg
          viewBox="0 0 64 64"
          className={`h-14 w-14 text-accent ${phase === 'done' && kind === 'timer' ? 'alarm-ringing' : ''}`}
          aria-hidden="true"
          focusable="false">
          <circle cx="32" cy="36" r="20" fill="var(--paper)" stroke="currentColor" strokeWidth="4" />
          <path d="M32 24v12l8 5" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
          <path
            d="M10 18a10 10 0 0 1 14-10M54 18A10 10 0 0 0 40 8"
            fill="none"
            stroke="currentColor"
            strokeWidth="4"
            strokeLinecap="round"
          />
          <path d="M18 56l-4 5M46 56l4 5" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
        </svg>
        <p className="font-display text-7xl font-semibold tabular-nums" aria-hidden="true">
          {clockText(shown)}
        </p>
        <p className="sr-only" role="timer">
          {clockText(shown)}
        </p>
        <div className="flex gap-3">
          {phase === 'running' ? (
            <button type="button" onClick={pause} className={buttonClass}>
              {t('Pause')}
            </button>
          ) : null}
          {phase === 'idle' || phase === 'paused' ? (
            <button
              type="button"
              onClick={start}
              className="rounded-sm bg-accent px-4 py-2 font-display text-sm font-semibold text-accent-ink">
              {phase === 'idle' ? t('Start') : t('Resume')}
            </button>
          ) : null}
          {phase !== 'idle' && phase !== 'done' ? (
            <button type="button" onClick={() => setPhase('done')} className={buttonClass}>
              {t('Finish')}
            </button>
          ) : null}
          {phase !== 'idle' ? (
            <button type="button" onClick={reset} className={buttonClass}>
              {t('Start over')}
            </button>
          ) : null}
        </div>
        <p role="status" className="min-h-5 font-display text-lg text-accent">
          {phase === 'done' ? t('Pens down! How much did you write?') : ''}
        </p>
      </div>
      {phase === 'done' && books.length > 0 ? (
        <section className="sheet rounded-sm p-6">
          <UpdateForm action={action} books={books} selectedGoal={selectedGoal} today={today} compact />
        </section>
      ) : null}
    </div>
  );
}
