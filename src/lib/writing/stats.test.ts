import { goalStats, longestStreak, sumByDate, writingStreak } from './stats';

const NOVEMBER = { target: 50000, startDate: '2026-11-01', endDate: '2026-11-30' };

describe('goalStats', () => {
  it('follows a goal in progress', () => {
    const stats = goalStats(
      NOVEMBER,
      [
        { date: '2026-11-01', count: 2000 },
        { date: '2026-11-02', count: 1000 },
        { date: '2026-11-02', count: 500 },
        { date: '2026-11-04', count: 800 },
      ],
      '2026-11-04',
    );

    expect(stats).toMatchObject({
      state: 'active',
      total: 4300,
      percent: 8,
      remaining: 45700,
      reached: false,
      reachedOn: null,
      totalDays: 30,
      daysElapsed: 4,
      daysLeft: 27,
      writtenToday: 800,
      neededToday: Math.ceil(46500 / 27),
      dailyPar: 1667,
      parToday: 6667,
      averagePerDay: 1075,
      projectedFinish: '2026-12-17',
      bestDay: { date: '2026-11-01', count: 2000 },
    });
    expect(stats.daily[1]).toEqual({ date: '2026-11-02', count: 1500, cumulative: 3500, par: 3333 });
    expect(stats.daily).toHaveLength(30);
  });

  it('asks for nothing more today once the goal is reached', () => {
    const stats = goalStats(
      { ...NOVEMBER, target: 3000 },
      [
        { date: '2026-11-01', count: 1000 },
        { date: '2026-11-03', count: 2500 },
      ],
      '2026-11-05',
    );

    expect(stats).toMatchObject({ reached: true, reachedOn: '2026-11-03', percent: 100, neededToday: 0 });
    expect(stats.projectedFinish).toBeNull();
  });

  it('counts words logged outside the dates as reached on the last counted day', () => {
    const stats = goalStats({ ...NOVEMBER, target: 100 }, [{ date: '2026-10-20', count: 150 }], '2026-11-02');

    expect(stats.reachedOn).toBe('2026-11-02');
  });

  it('waits before the start', () => {
    const stats = goalStats(NOVEMBER, [], '2026-10-28');

    expect(stats).toMatchObject({
      state: 'upcoming',
      daysElapsed: 0,
      daysLeft: 30,
      neededToday: 0,
      parToday: 0,
      averagePerDay: 0,
      projectedFinish: null,
      bestDay: null,
    });
  });

  it('closes after the end', () => {
    const stats = goalStats(NOVEMBER, [{ date: '2026-11-10', count: 1000 }], '2026-12-03');

    expect(stats).toMatchObject({
      state: 'ended',
      daysElapsed: 30,
      daysLeft: 0,
      writtenToday: 0,
      neededToday: 0,
      parToday: 50000,
      projectedFinish: null,
    });
  });
});

describe('streaks', () => {
  const entries = [
    { date: '2026-11-01', count: 100 },
    { date: '2026-11-02', count: 100 },
    { date: '2026-11-03', count: 100 },
    { date: '2026-11-05', count: 100 },
    { date: '2026-11-06', count: 0 },
    { date: '2026-11-07', count: 50 },
    { date: '2026-11-08', count: 50 },
  ];

  it('keeps the streak alive until the day ends', () => {
    expect(writingStreak(entries, '2026-11-08')).toBe(2);
    expect(writingStreak(entries, '2026-11-09')).toBe(2);
    expect(writingStreak(entries, '2026-11-10')).toBe(0);
  });

  it('finds the longest run of writing days', () => {
    expect(longestStreak(entries)).toBe(3);
    expect(longestStreak([])).toBe(0);
  });

  it('adds counts of the same day', () => {
    expect(sumByDate(entries.slice(0, 1).concat({ date: '2026-11-01', count: 5 })).get('2026-11-01')).toBe(105);
  });
});
