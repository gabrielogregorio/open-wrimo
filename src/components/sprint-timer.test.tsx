import { act, fireEvent, screen } from '@testing-library/react';
import type { FormState } from '@/lib/form';
import { renderWithLocale } from '@/test/render';
import { playAlarmRing } from './alarm-sound';
import { SprintTimer, clockText } from './sprint-timer';
import type { BookChoice } from './update-form';

vi.mock('./alarm-sound', () => ({ playAlarmRing: vi.fn(async () => undefined) }));

const action = async (): Promise<FormState> => ({});

const books: BookChoice[] = [
  {
    projectId: 'p1',
    title: 'First Novel',
    coverUrl: null,
    statusLabel: 'In progress',
    goals: [{ id: 'g1', label: 'November', unitLabel: 'words', total: 1000 }],
  },
];

const timer = (): string => screen.getByRole('timer').textContent ?? '';

const advance = (milliseconds: number): void => {
  act(() => {
    vi.advanceTimersByTime(milliseconds);
  });
};

const setup = (bookList: BookChoice[] = books): void => {
  renderWithLocale(<SprintTimer action={action} books={bookList} selectedGoal="g1" today="2026-11-05" />);
};

const click = (element: HTMLElement): void => {
  fireEvent.click(element);
};

describe('clockText', () => {
  it('formats minutes, hours and negative values', () => {
    expect(clockText(65)).toBe('01:05');
    expect(clockText(3725)).toBe('1:02:05');
    expect(clockText(-3)).toBe('00:00');
  });
});

describe('SprintTimer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.mocked(playAlarmRing).mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('counts a timer down, rings at the end and asks for the update', () => {
    setup();

    expect(timer()).toBe('15:00');
    click(screen.getByRole('button', { name: '5 min' }));

    expect(screen.getByRole('button', { name: '5 min' })).toHaveAttribute('aria-pressed', 'true');
    expect(timer()).toBe('05:00');
    click(screen.getByRole('button', { name: 'Start' }));

    expect(screen.getByRole('button', { name: '10 min' })).toBeDisabled();
    expect(screen.getByRole('radio', { name: 'Stopwatch' })).toBeDisabled();
    advance(60_000);

    expect(timer()).toBe('04:00');
    advance(240_000);

    expect(timer()).toBe('00:00');
    expect(playAlarmRing).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Pens down! How much did you write?')).toHaveAttribute('role', 'status');
    expect(screen.getByRole('radiogroup', { name: 'Which book did you write in?' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Finish' })).not.toBeInTheDocument();
  });

  it('pauses, resumes, finishes early and starts over', () => {
    setup([]);

    click(screen.getByRole('button', { name: 'Start' }));
    advance(30_000);
    click(screen.getByRole('button', { name: 'Pause' }));

    expect(timer()).toBe('14:30');
    advance(60_000);

    expect(timer()).toBe('14:30');
    click(screen.getByRole('button', { name: 'Resume' }));
    advance(30_000);

    expect(timer()).toBe('14:00');
    click(screen.getByRole('button', { name: 'Finish' }));

    expect(screen.getByRole('status')).toHaveTextContent('Pens down!');
    expect(screen.queryByRole('radiogroup', { name: 'Which book did you write in?' })).not.toBeInTheDocument();
    expect(playAlarmRing).not.toHaveBeenCalled();
    click(screen.getByRole('button', { name: 'Start over' }));

    expect(timer()).toBe('15:00');
    expect(screen.getByRole('button', { name: 'Start' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('');
  });

  it('runs a stopwatch past an hour without ringing', () => {
    setup();

    click(screen.getByRole('radio', { name: 'Stopwatch' }));

    expect(screen.getByRole('radio', { name: 'Stopwatch' })).toBeChecked();
    expect(screen.queryByRole('group', { name: 'Minutes' })).not.toBeInTheDocument();
    expect(timer()).toBe('00:00');
    click(screen.getByRole('button', { name: 'Start' }));
    advance(3_661_000);

    expect(timer()).toBe('1:01:01');
    expect(playAlarmRing).not.toHaveBeenCalled();
    click(screen.getByRole('button', { name: 'Pause' }));
    click(screen.getByRole('radio', { name: 'Timer' }));

    expect(timer()).toBe('15:00');
    expect(screen.getByRole('group', { name: 'Minutes' })).toBeInTheDocument();
  });
});
