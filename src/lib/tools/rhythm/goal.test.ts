import { planGoal, recentPace } from './goal';

const wordsByDay = [
  { date: '2026-10-31', count: 5000 },
  { date: '2026-11-02', count: 700 },
  { date: '2026-11-08', count: 700 },
  { date: '2026-11-09', count: 9000 },
];

describe('recentPace', () => {
  it('averages the last seven days, today included', () => {
    expect(recentPace(wordsByDay, '2026-11-08')).toBe(200);
  });
});

describe('planGoal', () => {
  const base = { today: '2026-11-08', target: 50000, current: 10000, endDate: '2026-11-30', wordsByDay };

  it('splits the remaining words over the days left, today included', () => {
    expect(planGoal(base)).toEqual({
      remaining: 40000,
      daysLeft: 23,
      perDay: 1740,
      pace: 200,
      projectedDate: '2027-05-26',
      onTrack: false,
    });
  });

  it('says when the pace gets there in time', () => {
    expect(planGoal({ ...base, current: 46000 })).toMatchObject({ projectedDate: '2026-11-27', onTrack: true });
  });

  it('handles a finished goal, no pace and a past date', () => {
    expect(planGoal({ ...base, current: 60000 })).toMatchObject({ remaining: 0, perDay: 0, onTrack: true });
    expect(planGoal({ ...base, wordsByDay: [] })).toMatchObject({ projectedDate: null, onTrack: false });
    expect(planGoal({ ...base, endDate: '2026-11-01' })).toMatchObject({ daysLeft: 0, perDay: 40000, onTrack: false });
  });
});
