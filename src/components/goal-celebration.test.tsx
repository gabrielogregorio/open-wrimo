import { act, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithLocale } from '@/test/render';
import { playAchievementSound } from './achievement-sound';
import { launchConfetti } from './confetti';
import { GoalCelebration, type BeatenGoal } from './goal-celebration';

vi.mock('./achievement-sound', () => ({ playAchievementSound: vi.fn(async () => undefined) }));
vi.mock('./confetti', () => ({ launchConfetti: vi.fn() }));

const SEEN_KEY = 'openwrimo-beaten-goals';

const beaten: BeatenGoal[] = [
  { key: 'g1', name: 'November', novel: 'First Novel', percent: 104 },
  { key: 'g2', name: 'Daily', novel: 'Second Novel', percent: 120 },
];

describe('GoalCelebration', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.mocked(launchConfetti).mockClear();
    vi.mocked(playAchievementSound).mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('only remembers the beaten goals on the first visit', () => {
    renderWithLocale(<GoalCelebration beaten={beaten} />);

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(JSON.parse(window.localStorage.getItem(SEEN_KEY) ?? '[]')).toEqual(['g1', 'g2']);
    expect(launchConfetti).not.toHaveBeenCalled();
  });

  it('stays quiet when every beaten goal was already seen', () => {
    window.localStorage.setItem(SEEN_KEY, JSON.stringify(['g1', 'g2']));
    renderWithLocale(<GoalCelebration beaten={beaten} />);

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('celebrates a newly beaten goal and closes on request', async () => {
    window.localStorage.setItem(SEEN_KEY, JSON.stringify(['g1']));
    renderWithLocale(<GoalCelebration beaten={beaten} />);

    const banner = screen.getByRole('status');

    expect(banner).toHaveTextContent('Goal beaten!');
    expect(banner).toHaveTextContent('Daily · Second Novel');
    expect(banner).toHaveTextContent('120%');
    expect(launchConfetti).toHaveBeenCalledTimes(1);
    expect(playAchievementSound).toHaveBeenCalledWith('goal');

    await userEvent.click(screen.getByRole('button', { name: 'Close' }));

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('hides the banner by itself after a while, in Portuguese', () => {
    vi.useFakeTimers();
    window.localStorage.setItem(SEEN_KEY, JSON.stringify([]));
    const { unmount } = renderWithLocale(<GoalCelebration beaten={beaten} />, 'pt-BR');

    expect(screen.getByRole('status')).toHaveTextContent('November · First Novel');
    act(() => {
      vi.advanceTimersByTime(7000);
    });

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    unmount();
  });
});
