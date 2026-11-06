import {
  LIFETIME_BADGES,
  PARTICIPATION_BADGES,
  PERSONAL_BADGES,
  WRITING_BADGES,
  earnedLifetimeBadges,
  earnedParticipationBadges,
  earnedWritingBadges,
  laurels,
  onlyPersonalBadges,
} from './badges';
import type { EntryView, GoalView } from './repository';

const PROJECT = 'p1';

const entry = (date: string, count: number, overrides: Partial<EntryView> = {}): EntryView => ({
  id: `${date}-${count}`,
  projectId: PROJECT,
  unit: 'words',
  date,
  count,
  mood: null,
  place: '',
  source: 'update',
  hour: -1,
  createdAt: `${date}T12:00:00.000Z`,
  ...overrides,
});

const goal = (overrides: Partial<GoalView> = {}): GoalView => ({
  id: 'g1',
  projectId: PROJECT,
  name: 'Sprint week',
  unit: 'words',
  target: 3000,
  startDate: '2026-11-01',
  endDate: '2026-11-03',
  ...overrides,
});

describe('writing badges', () => {
  it('has unique ids', () => {
    const ids = [...WRITING_BADGES, ...LIFETIME_BADGES, ...PERSONAL_BADGES, ...PARTICIPATION_BADGES].map(
      (badge) => badge.id,
    );

    expect(new Set(ids).size).toBe(ids.length);
  });

  it('earns nothing before the first words', () => {
    expect(earnedWritingBadges({ goals: [], entries: [] }, '2026-11-05')).toEqual(new Set());
  });

  it('earns streaks, milestones, par days and goal badges', () => {
    const entries = [
      entry('2026-11-01', 1000, { hour: 6 }),
      entry('2026-11-02', 1000, { hour: 23, source: 'sprint' }),
      entry('2026-11-03', 1700),
      entry('2026-11-03', 2, { unit: 'hours' }),
    ];
    const earned = earnedWritingBadges({ goals: [goal()], entries }, '2026-11-05');

    expect([...earned].sort()).toEqual(
      [
        'early-bird',
        'first-update',
        'goal-met',
        'halfway',
        'night-owl',
        'par-day',
        'par-every-day',
        'sprinter',
        'streak-2',
        'streak-3',
        'words-1000',
      ].sort(),
    );
  });

  it('counts very late hours as night and skips backdated hours', () => {
    expect(earnedWritingBadges({ goals: [], entries: [entry('2026-11-01', 5, { hour: 2 })] }, '2026-11-01')).toContain(
      'night-owl',
    );
    expect(
      earnedWritingBadges({ goals: [], entries: [entry('2026-11-01', 5, { hour: 12 })] }, '2026-11-01'),
    ).not.toContain('early-bird');
  });

  it('does not reward a goal that fell behind par or is still open', () => {
    const behind = [entry('2026-11-01', 100), entry('2026-11-03', 2900)];
    const earned = earnedWritingBadges({ goals: [goal()], entries: behind }, '2026-11-05');

    expect(earned).toContain('goal-met');
    expect(earned).not.toContain('par-every-day');
    expect(
      earnedWritingBadges(
        { goals: [goal({ endDate: '2026-11-30' })], entries: [entry('2026-11-01', 100)] },
        '2026-11-02',
      ),
    ).not.toContain('par-every-day');
  });

  it('rewards staying on par through a goal that ended short', () => {
    const goalBadges = earnedWritingBadges(
      {
        goals: [goal({ target: 30 })],
        entries: [entry('2026-11-01', 10), entry('2026-11-02', 10), entry('2026-11-03', 10)],
      },
      '2026-11-10',
    );

    expect(goalBadges).toContain('par-every-day');
  });

  it('keeps only personal badge ids', () => {
    expect(onlyPersonalBadges(['in-my-eye', 'goal-met', 'in-my-eye'])).toEqual(['in-my-eye']);
  });

  it('gives one laurel per goal reached', () => {
    const entries = [entry('2026-11-01', 3000), entry('2026-11-01', 50, { projectId: 'p2' })];

    expect(
      laurels(
        [goal(), goal({ id: 'g2', target: 9000 }), goal({ id: 'g3', projectId: 'p2', target: 40 })],
        entries,
        '2026-11-05',
      ),
    ).toBe(2);
  });

  it('counts words across all novels for the lifetime badges', () => {
    expect(earnedLifetimeBadges(99_999)).toEqual(new Set());
    expect(earnedLifetimeBadges(1_000_000)).toEqual(new Set(['lifetime-100000', 'lifetime-1000000']));
  });

  it('earns participation badges from novels, goals and covers', () => {
    expect(earnedParticipationBadges({ projects: [], goals: [] })).toEqual(new Set());
    expect(earnedParticipationBadges({ projects: [{ coverUrl: null }], goals: [] })).toEqual(new Set(['first-novel']));
    expect(earnedParticipationBadges({ projects: [{ coverUrl: '/media/c.webp' }], goals: [{}] })).toEqual(
      new Set(['first-novel', 'first-goal', 'cover-art']),
    );
  });
});
