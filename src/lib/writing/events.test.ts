import { EVENT_IDS, eventGoal } from './events';

const plain = (text: string, values: Record<string, string | number>): string =>
  text.replace('{year}', String(values.year));

describe('eventGoal', () => {
  it('lists the events', () => {
    expect(EVENT_IDS).toEqual(['november', 'april-camp', 'july-camp']);
  });

  it('takes this year while the month is not over', () => {
    expect(eventGoal('november', '2026-11-30', plain)).toEqual({
      name: 'November novel 2026',
      unit: 'words',
      target: 50000,
      startDate: '2026-11-01',
      endDate: '2026-11-30',
      period: null,
    });
    expect(eventGoal('april-camp', '2026-01-10', plain)).toMatchObject({
      startDate: '2026-04-01',
      endDate: '2026-04-30',
    });
  });

  it('moves to next year once the month is over', () => {
    expect(eventGoal('july-camp', '2026-08-01', plain)).toMatchObject({
      name: 'July camp 2027',
      target: 30000,
      startDate: '2027-07-01',
      endDate: '2027-07-31',
    });
  });

  it('ends on the last day of the month', () => {
    expect(eventGoal('april-camp', '2026-05-01', plain).endDate).toBe('2027-04-30');
    expect(eventGoal('november', '2026-12-01', plain).endDate).toBe('2027-11-30');
  });
});
