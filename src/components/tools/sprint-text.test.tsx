import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import { logSprintAction } from '@/app/actions/writing';
import { renderWithLocale } from '@/test/render';
import { playAlarmRing } from '../alarm-sound';
import SprintText from './sprint-text';
import { clearLocalDb, toolData } from './write/test-support';

vi.mock('@/app/actions/writing', () => ({ logSprintAction: vi.fn(async () => ({ saved: true })) }));
vi.mock('../alarm-sound', () => ({ playAlarmRing: vi.fn(async () => undefined) }));

const area = (): HTMLTextAreaElement => screen.getByRole('textbox', { name: 'Your text' });
const timer = (): string => screen.getByRole('timer').textContent ?? '';
const type = (text: string): void => {
  fireEvent.change(area(), { target: { value: text } });
};
const advance = (milliseconds: number): void => {
  act(() => {
    vi.advanceTimersByTime(milliseconds);
  });
};
const click = (name: string): void => {
  fireEvent.click(screen.getByRole('button', { name }));
};

describe('SprintText', () => {
  beforeEach(async () => {
    await clearLocalDb();
    window.history.replaceState({}, '', '/write/tools/sprint-text');
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('counts the words written during the sprint, rings and logs them', async () => {
    renderWithLocale(<SprintText data={toolData} />);
    await waitFor(() => expect(area()).toBeEnabled());
    type('antes do sprint');
    click('5 min');

    expect(timer()).toBe('05:00');
    expect(screen.getByText('0 words in this sprint')).toBeInTheDocument();
    click('Start');

    expect(screen.getByRole('button', { name: '10 min' })).toBeDisabled();
    type('antes do sprint e depois');
    advance(60_000);

    expect(timer()).toBe('04:00');
    expect(screen.getByText('2 words in this sprint')).toBeInTheDocument();
    click('Pause');
    advance(60_000);

    expect(timer()).toBe('04:00');
    click('Resume');
    advance(240_000);

    expect(timer()).toBe('00:00');
    expect(playAlarmRing).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Pens down! You wrote 2 words.')).toHaveAttribute('role', 'status');
    fireEvent.click(screen.getByRole('button', { name: 'Log 2 words' }));

    await waitFor(() => expect(screen.getByText('Words logged to your goal.')).toBeInTheDocument());
    expect(vi.mocked(logSprintAction).mock.calls[0][1].get('count')).toBe('2');
    expect(screen.getByText('0 words in this sprint')).toBeInTheDocument();
    click('Start over');

    expect(timer()).toBe('05:00');
    expect(screen.queryByText(/Pens down/)).not.toBeInTheDocument();
  });

  it('finishes early from a pause without ringing', async () => {
    renderWithLocale(<SprintText data={toolData} />);
    await waitFor(() => expect(area()).toBeEnabled());
    click('Start');
    advance(30_000);
    click('Finish');

    expect(timer()).toBe('14:30');
    expect(playAlarmRing).not.toHaveBeenCalled();
    click('Start over');
    click('Start');
    click('Pause');
    click('Finish');

    expect(screen.getByText('Pens down! You wrote 0 words.')).toBeInTheDocument();
  });
});
