import {
  DEFAULT_POMODORO,
  advancePomodoro,
  initialPomodoro,
  pausePomodoro,
  phaseLength,
  remainingOf,
  skipPomodoro,
  startPomodoro,
} from './pomodoro';

const MINUTE = 60_000;
const settings = DEFAULT_POMODORO;

describe('pomodoro', () => {
  it('starts, pauses and resumes from timestamps', () => {
    const initial = initialPomodoro(settings);

    expect(remainingOf(initial, 0)).toBe(25 * MINUTE);
    const running = startPomodoro(initial, 1000);

    expect(remainingOf(running, 1000 + MINUTE)).toBe(24 * MINUTE);
    expect(remainingOf(running, 1000 + 30 * MINUTE)).toBe(0);
    const paused = pausePomodoro(running, 1000 + MINUTE);

    expect(paused).toMatchObject({ running: false, remaining: 24 * MINUTE });
    expect(startPomodoro(paused, 5000).endsAt).toBe(5000 + 24 * MINUTE);
  });

  it('skips to the next phase and takes a long rest every fourth round', () => {
    let state = initialPomodoro(settings);
    const phases: string[] = [];

    for (let step = 0; step < 8; step += 1) {
      state = skipPomodoro(state, settings, 0);
      phases.push(`${state.phase}:${state.round}`);
    }

    expect(phases).toEqual(['rest:1', 'write:2', 'rest:2', 'write:3', 'rest:3', 'write:4', 'long-rest:4', 'write:5']);
    expect(phaseLength(settings, 'long-rest')).toBe(15 * MINUTE);
  });

  it('catches up on every phase that ended while the tab slept', () => {
    const running = startPomodoro(initialPomodoro(settings), 0);

    expect(advancePomodoro(running, settings, MINUTE)).toEqual({ state: running, switched: 0 });
    const woke = advancePomodoro(running, settings, 31 * MINUTE);

    expect(woke.switched).toBe(2);
    expect(woke.state).toMatchObject({ phase: 'write', round: 2, endsAt: 55 * MINUTE });
    expect(advancePomodoro(pausePomodoro(running, 0), settings, 99 * MINUTE).switched).toBe(0);
  });
});
