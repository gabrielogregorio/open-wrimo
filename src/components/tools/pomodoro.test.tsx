import { act, fireEvent, screen } from '@testing-library/react';
import { playAlarmRing } from '@/components/alarm-sound';
import { renderWithLocale } from '@/test/render';
import Pomodoro from './pomodoro';

vi.mock('@/components/alarm-sound', () => ({ playAlarmRing: vi.fn(async () => undefined) }));

const timer = (): string => screen.getByRole('timer').textContent ?? '';

const advance = (milliseconds: number): void => {
  act(() => {
    vi.advanceTimersByTime(milliseconds);
  });
};

const click = (name: string): void => {
  fireEvent.click(screen.getByRole('button', { name }));
};

describe('Pomodoro', () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: 0 });
    vi.mocked(playAlarmRing).mockClear();
    document.title = 'Pomodoro';
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('runs write and rest rounds from the clock, with the title showing the time', () => {
    renderWithLocale(<Pomodoro />);

    expect(timer()).toBe('Write 25:00');
    expect(screen.getByRole('button', { name: 'Start over' })).toBeDisabled();
    click('Start');
    advance(1000);
    expect(timer()).toBe('Write 24:59');
    expect(document.title).toBe('24:59 · Write');

    click('Pause');
    expect(document.title).toBe('Pomodoro');
    advance(60_000);
    expect(timer()).toBe('Write 24:59');
    click('Resume');

    vi.setSystemTime(26 * 60_000);
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(timer()).toBe('Rest 05:00');
    expect(playAlarmRing).toHaveBeenCalledTimes(1);

    advance(5 * 60_000);
    expect(screen.getByText(/Round 2/)).toBeInTheDocument();
    expect(playAlarmRing).toHaveBeenCalledTimes(2);

    click('Skip to the next phase');
    expect(timer()).toBe('Rest 05:00');
    expect(playAlarmRing).toHaveBeenCalledTimes(3);

    click('Start over');
    expect(timer()).toBe('Write 25:00');
    expect(screen.getByText(/Round 1/)).toBeInTheDocument();
  });

  it('changes the rounds before starting', () => {
    renderWithLocale(<Pomodoro />, 'pt-BR');

    fireEvent.change(screen.getByLabelText('Minutos de escrita'), { target: { value: '50' } });
    expect(timer()).toBe('Escrever 50:00');
    fireEvent.change(screen.getByLabelText('Minutos de escrita'), { target: { value: '999' } });
    expect(timer()).toBe('Escrever 03:00:00'.replace('03:00:00', '3:00:00'));
    fireEvent.change(screen.getByLabelText('Minutos de descanso'), { target: { value: '0' } });
    expect(screen.getByLabelText('Minutos de descanso')).toHaveValue('1');

    click('Pular para a próxima fase');
    expect(screen.getByText('Recomece para mudar as rodadas.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Continuar' })).toBeInTheDocument();
  });
});
