import { DEFAULT_REMINDER, localDay, normalizeReminder, reminderDue } from './reminder';

describe('normalizeReminder', () => {
  it('keeps valid values and fixes the rest', () => {
    expect(normalizeReminder(null)).toEqual(DEFAULT_REMINDER);
    expect(
      normalizeReminder({ enabled: true, time: '07:30', weekdays: [5, 1, 1, 9, 'x'], lastShownOn: '2026-11-08' }),
    ).toEqual({
      enabled: true,
      time: '07:30',
      weekdays: [1, 5],
      lastShownOn: '2026-11-08',
    });
    expect(normalizeReminder({ time: '25:00' })).toEqual(DEFAULT_REMINDER);
  });
});

describe('reminderDue', () => {
  const settings = { ...DEFAULT_REMINDER, enabled: true, time: '20:00' };
  // A Sunday, in the local time of the test runner.
  const at = (time: string): Date => new Date(`2026-11-08T${time}:00`);

  it('is due from the writing time for an hour, once a day, on the chosen weekdays', () => {
    expect(localDay(at('20:00'))).toBe('2026-11-08');
    expect(reminderDue(settings, at('19:59'))).toBeNull();
    expect(reminderDue(settings, at('20:00'))).toBe('2026-11-08');
    expect(reminderDue(settings, at('20:59'))).toBe('2026-11-08');
    expect(reminderDue(settings, at('21:00'))).toBeNull();
    expect(reminderDue({ ...settings, lastShownOn: '2026-11-08' }, at('20:10'))).toBeNull();
    expect(reminderDue({ ...settings, weekdays: [1] }, at('20:10'))).toBeNull();
    expect(reminderDue({ ...settings, enabled: false }, at('20:10'))).toBeNull();
  });
});
