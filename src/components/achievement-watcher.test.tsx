import { act, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderToString } from 'react-dom/server';
import type { Badge } from '@/lib/writing/badges';
import { renderWithLocale } from '@/test/render';
import { playAchievementSound, soundForBadge, soundIsOn } from './achievement-sound';
import { AchievementWatcher, type EarnedAchievement } from './achievement-watcher';
import { I18nProvider } from './i18n-provider';

vi.mock('./achievement-sound', () => ({
  SOUND_SETTING: 'openwrimo-sound',
  playAchievementSound: vi.fn(async () => undefined),
  soundForBadge: vi.fn(() => 'personal'),
  soundIsOn: vi.fn(() => true),
}));

const SEEN_KEY = 'openwrimo-seen-achievements';
const badge: Badge = { id: 'first-update', label: 'First words', description: 'Logged.', glyph: 'quill' };

const achievement = (key: string, label: string): EarnedAchievement => ({
  key,
  kind: 'writing',
  badge,
  label,
  novel: `Novel ${key}`,
});

const earned = [achievement('a', 'First words'), achievement('b', 'Halfway'), achievement('c', 'Goal met')];

describe('AchievementWatcher', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.mocked(soundIsOn).mockReturnValue(true);
  });

  it('only remembers the achievements on the first visit', () => {
    const { container } = renderWithLocale(<AchievementWatcher earned={earned} />);

    expect(container).toBeEmptyDOMElement();
    expect(JSON.parse(window.localStorage.getItem(SEEN_KEY) ?? '[]')).toEqual(['a', 'b', 'c']);
    expect(playAchievementSound).not.toHaveBeenCalled();
  });

  it('stays quiet when nothing new was earned', () => {
    window.localStorage.setItem(SEEN_KEY, JSON.stringify(['a', 'b', 'c']));

    const { container } = renderWithLocale(<AchievementWatcher earned={earned} />);

    expect(container).toBeEmptyDOMElement();
    expect(playAchievementSound).not.toHaveBeenCalled();
  });

  it('queues the new achievements, plays a sound and steps through them', async () => {
    window.localStorage.setItem(SEEN_KEY, JSON.stringify(['a']));

    renderWithLocale(<AchievementWatcher earned={earned} />);

    expect(screen.getByRole('status')).toHaveTextContent('Achievement unlocked!');
    expect(screen.getByText('Halfway')).toBeInTheDocument();
    expect(screen.getByText('Novel b')).toBeInTheDocument();
    expect(soundForBadge).toHaveBeenCalledWith('writing', 'first-update');
    expect(playAchievementSound).toHaveBeenCalledWith('personal');

    await userEvent.click(screen.getByRole('button', { name: 'Next (1)' }));

    expect(screen.getByText('Goal met')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Close' }));

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('closes every toast at once', async () => {
    window.localStorage.setItem(SEEN_KEY, JSON.stringify([]));

    renderWithLocale(<AchievementWatcher earned={earned} />);
    await userEvent.click(screen.getByRole('button', { name: 'Close all achievements' }));

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('hides each toast after six seconds', () => {
    vi.useFakeTimers();
    window.localStorage.setItem(SEEN_KEY, JSON.stringify(['a']));

    renderWithLocale(<AchievementWatcher earned={earned} />);

    act(() => {
      vi.advanceTimersByTime(6000);
    });

    expect(screen.getByText('Goal met')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(6000);
    });

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    vi.useRealTimers();
  });

  it('toggles the sound setting', async () => {
    window.localStorage.setItem(SEEN_KEY, JSON.stringify(['a', 'b']));

    renderWithLocale(<AchievementWatcher earned={earned} />);
    await userEvent.click(screen.getByRole('button', { name: 'Mute sounds' }));

    expect(window.localStorage.getItem('openwrimo-sound')).toBe('off');

    await userEvent.click(screen.getByRole('button', { name: 'Turn sounds on' }));

    expect(window.localStorage.getItem('openwrimo-sound')).toBe('on');
  });

  it('starts with sounds off when the saved setting says so', () => {
    vi.mocked(soundIsOn).mockReturnValue(false);
    window.localStorage.setItem(SEEN_KEY, JSON.stringify(['a', 'b']));

    renderWithLocale(<AchievementWatcher earned={earned} />);

    expect(screen.getByRole('button', { name: 'Turn sounds on' })).toBeInTheDocument();
  });

  it('renders nothing on the server without reading the sound setting', () => {
    vi.stubGlobal('window', undefined);

    const html = renderToString(
      <I18nProvider locale="en-US">
        <AchievementWatcher earned={earned} />
      </I18nProvider>,
    );

    vi.unstubAllGlobals();

    expect(html).toBe('');
    expect(soundIsOn).not.toHaveBeenCalled();
  });
});
