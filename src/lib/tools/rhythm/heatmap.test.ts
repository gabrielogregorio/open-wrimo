import { levelOf, yearHeat } from './heatmap';

describe('levelOf', () => {
  it('maps words to five levels', () => {
    expect(levelOf(0, 100)).toBe(0);
    expect(levelOf(5, 0)).toBe(0);
    expect(levelOf(1, 100)).toBe(1);
    expect(levelOf(50, 100)).toBe(2);
    expect(levelOf(100, 100)).toBe(4);
  });
});

describe('yearHeat', () => {
  it('lays the year out in weeks starting on Sunday', () => {
    const heat = yearHeat(2026, [
      { date: '2025-12-31', count: 999 },
      { date: '2026-01-01', count: 100 },
      { date: '2026-01-02', count: 300 },
      { date: '2026-01-02', count: 100 },
      { date: '2026-01-03', count: 0 },
      { date: '2026-03-10', count: 50 },
      { date: '2026-03-11', count: 50 },
      { date: '2026-03-12', count: 50 },
    ]);

    expect(heat.weeks).toHaveLength(53);
    expect(heat.weeks[0].slice(0, 4)).toEqual([null, null, null, null]);
    expect(heat.weeks[0][4]).toEqual({ date: '2026-01-01', count: 100, level: 1 });
    expect(heat.weeks[0][5]).toEqual({ date: '2026-01-02', count: 400, level: 4 });
    expect(heat.weeks[52][4]).toEqual({ date: '2026-12-31', count: 0, level: 0 });
    expect(heat.weeks[52][5]).toBeNull();
    expect(heat.months[0]).toEqual({ month: 0, week: 0 });
    expect(heat.months[11]).toEqual({ month: 11, week: 48 });
    expect(heat).toMatchObject({ total: 650, daysWritten: 5, longestStreak: 3, max: 400 });
  });

  it('handles an empty year and a 54-week leap year', () => {
    expect(yearHeat(2033, [])).toMatchObject({ total: 0, daysWritten: 0, longestStreak: 0, max: 0 });
    expect(yearHeat(2000, []).weeks).toHaveLength(54);
  });
});
