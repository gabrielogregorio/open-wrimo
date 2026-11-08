'use client';

import { useEffect, useRef, useState } from 'react';
import { playAlarmRing } from '@/components/alarm-sound';
import { useI18n } from '@/components/i18n-provider';
import { clockText } from '@/components/sprint-timer';
import {
  DEFAULT_POMODORO,
  advancePomodoro,
  initialPomodoro,
  pausePomodoro,
  remainingOf,
  skipPomodoro,
  startPomodoro,
  type PomodoroPhase,
  type PomodoroSettings,
} from '@/lib/tools/rhythm/pomodoro';
import { CountField } from './rhythm/count-field';

const PHASE_NAMES: Record<PomodoroPhase, string> = {
  write: 'Write',
  rest: 'Rest',
  'long-rest': 'Long rest',
};

const SETTING_LABELS: Record<keyof PomodoroSettings, string> = {
  write: 'Writing minutes',
  rest: 'Rest minutes',
  longRest: 'Long rest minutes',
  longEvery: 'Long rest every (rounds)',
};

const SETTING_KEYS = Object.keys(SETTING_LABELS) as (keyof PomodoroSettings)[];

export default function Pomodoro() {
  const { t } = useI18n();
  const [settings, setSettings] = useState(DEFAULT_POMODORO);
  const [state, setState] = useState(() => initialPomodoro(DEFAULT_POMODORO));
  const [now, setNow] = useState(0);
  const [started, setStarted] = useState(false);
  const pageTitle = useRef('');
  const remaining = remainingOf(state, now);
  const phaseName = t(PHASE_NAMES[state.phase]);

  useEffect(() => {
    if (!state.running) {
      return undefined;
    }

    const tick = (): void => {
      const moment = Date.now();
      const advanced = advancePomodoro(state, settings, moment);
      setNow(moment);

      if (advanced.switched > 0) {
        setState(advanced.state);
        void playAlarmRing();
      }
    };
    const interval = window.setInterval(tick, 250);
    document.addEventListener('visibilitychange', tick);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [state, settings]);

  useEffect(() => {
    if (!state.running) {
      return undefined;
    }

    pageTitle.current ||= document.title;
    document.title = `${clockText(remaining / 1000)} · ${phaseName}`;

    return () => {
      document.title = pageTitle.current;
    };
  }, [state.running, remaining, phaseName]);

  const start = (): void => {
    const moment = Date.now();
    setNow(moment);
    setStarted(true);
    setState(startPomodoro(state, moment));
  };

  const pause = (): void => {
    const moment = Date.now();
    setNow(moment);
    setState(pausePomodoro(state, moment));
  };

  const skip = (): void => {
    const moment = Date.now();
    setNow(moment);
    setStarted(true);
    setState(skipPomodoro(state, settings, moment));
    void playAlarmRing();
  };

  const reset = (next: PomodoroSettings = settings): void => {
    setStarted(false);
    setState(initialPomodoro(next));
  };

  const changeSetting = (key: keyof PomodoroSettings, value: number): void => {
    const next = { ...settings, [key]: Math.min(180, Math.max(1, value)) };
    setSettings(next);
    reset(next);
  };

  const buttonClass = 'min-h-11 rounded-sm border border-rule px-4 py-2 font-display text-sm';

  return (
    <div className="flex flex-col gap-5">
      <section className="sheet flex flex-col items-center gap-4 rounded-sm p-6 sm:p-8">
        <p className="font-display text-lg text-ink-soft">
          {t('Round {round}', { round: state.round })} · <span className="text-accent">{phaseName}</span>
        </p>
        <p className="font-display text-7xl font-semibold tabular-nums" aria-hidden="true">
          {clockText(remaining / 1000)}
        </p>
        <p className="sr-only" role="timer">
          {phaseName} {clockText(remaining / 1000)}
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          {state.running ? (
            <button type="button" onClick={pause} className={buttonClass}>
              {t('Pause')}
            </button>
          ) : (
            <button
              type="button"
              onClick={start}
              className="min-h-11 rounded-sm bg-accent px-5 py-2 font-display text-sm font-semibold text-accent-ink">
              {started ? t('Resume') : t('Start')}
            </button>
          )}
          <button type="button" onClick={skip} className={buttonClass}>
            {t('Skip to the next phase')}
          </button>
          <button type="button" onClick={() => reset()} className={buttonClass} disabled={!started}>
            {t('Start over')}
          </button>
        </div>
      </section>
      <section className="sheet rounded-sm p-5 sm:p-6">
        <h2 className="mb-3 font-display text-lg font-semibold">{t('Rounds')}</h2>
        <fieldset disabled={started} className="grid grid-cols-2 gap-4">
          {SETTING_KEYS.map((key) => (
            <CountField
              key={key}
              id={`pomodoro-${key}`}
              label={t(SETTING_LABELS[key])}
              value={settings[key]}
              onChange={(value) => changeSetting(key, value)}
            />
          ))}
        </fieldset>
        {started ? <p className="mt-3 text-xs text-ink-soft">{t('Start over to change the rounds.')}</p> : null}
      </section>
    </div>
  );
}
