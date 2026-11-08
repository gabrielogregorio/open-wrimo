// Pomodoro rounds computed from timestamps, so the clock stays right when the tab sleeps.
export type PomodoroPhase = 'write' | 'rest' | 'long-rest';

export type PomodoroSettings = { write: number; rest: number; longRest: number; longEvery: number };

export type PomodoroState = {
  phase: PomodoroPhase;
  round: number;
  running: boolean;
  endsAt: number;
  remaining: number;
};

export const DEFAULT_POMODORO: PomodoroSettings = { write: 25, rest: 5, longRest: 15, longEvery: 4 };

const MINUTE = 60_000;

export const phaseLength = (settings: PomodoroSettings, phase: PomodoroPhase): number => {
  const minutes = { write: settings.write, rest: settings.rest, 'long-rest': settings.longRest }[phase];

  return minutes * MINUTE;
};

export const initialPomodoro = (settings: PomodoroSettings): PomodoroState => ({
  phase: 'write',
  round: 1,
  running: false,
  endsAt: 0,
  remaining: phaseLength(settings, 'write'),
});

const following = (state: PomodoroState, settings: PomodoroSettings): Pick<PomodoroState, 'phase' | 'round'> => {
  if (state.phase !== 'write') {
    return { phase: 'write', round: state.round + 1 };
  }

  return { phase: state.round % settings.longEvery === 0 ? 'long-rest' : 'rest', round: state.round };
};

export const remainingOf = (state: PomodoroState, now: number): number =>
  state.running ? Math.max(0, state.endsAt - now) : state.remaining;

export const startPomodoro = (state: PomodoroState, now: number): PomodoroState => ({
  ...state,
  running: true,
  endsAt: now + state.remaining,
});

export const pausePomodoro = (state: PomodoroState, now: number): PomodoroState => ({
  ...state,
  running: false,
  remaining: remainingOf(state, now),
});

export const skipPomodoro = (state: PomodoroState, settings: PomodoroSettings, now: number): PomodoroState => {
  const next = following(state, settings);
  const length = phaseLength(settings, next.phase);

  return { ...state, ...next, remaining: length, endsAt: now + length };
};

// Moves past every phase that ended by now; a long sleep may cross several of them.
export const advancePomodoro = (
  state: PomodoroState,
  settings: PomodoroSettings,
  now: number,
): { state: PomodoroState; switched: number } => {
  let current = state;
  let switched = 0;

  while (current.running && now >= current.endsAt) {
    const next = following(current, settings);
    const length = phaseLength(settings, next.phase);
    current = { ...current, ...next, endsAt: current.endsAt + length, remaining: length };
    switched += 1;
  }

  return { state: current, switched };
};
