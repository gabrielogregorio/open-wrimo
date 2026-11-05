import {
  DEFAULT_TIME_ZONE,
  addDays,
  datesFrom,
  daysBetween,
  isIsoDate,
  isTimeZone,
  localDate,
  localHour,
  resolveTimeZone,
} from './dates';

describe('time zones', () => {
  it.each(['America/Sao_Paulo', 'UTC', 'Asia/Tokyo'])('accepts %s', (zone) => {
    expect(isTimeZone(zone)).toBe(true);
    expect(resolveTimeZone(zone)).toBe(zone);
  });

  it.each([undefined, '', 'Mars/Olympus', 'x'.repeat(65)])('falls back to UTC for %s', (zone) => {
    expect(resolveTimeZone(zone)).toBe(DEFAULT_TIME_ZONE);
  });

  it('refuses what is not a string', () => {
    expect(isTimeZone(42)).toBe(false);
  });
});

describe('calendar dates', () => {
  const lateNightInSaoPaulo = new Date('2026-11-06T02:30:00.000Z');

  it('reads the date and hour where the writer lives', () => {
    expect(localDate(lateNightInSaoPaulo, 'America/Sao_Paulo')).toBe('2026-11-05');
    expect(localDate(lateNightInSaoPaulo, 'UTC')).toBe('2026-11-06');
    expect(localHour(lateNightInSaoPaulo, 'America/Sao_Paulo')).toBe(23);
    expect(localHour(new Date('2026-11-06T00:15:00.000Z'), 'UTC')).toBe(0);
  });

  it.each([
    ['2026-11-05', true],
    ['2024-02-29', true],
    ['2026-02-29', false],
    ['2026-13-01', false],
    ['05/11/2026', false],
  ])('checks %s as a date', (value, valid) => {
    expect(isIsoDate(value)).toBe(valid);
  });

  it('counts and walks days across months', () => {
    expect(daysBetween('2026-10-30', '2026-11-02')).toBe(3);
    expect(addDays('2026-11-30', 1)).toBe('2026-12-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
    expect(datesFrom('2026-10-31', '2026-11-02')).toEqual(['2026-10-31', '2026-11-01', '2026-11-02']);
    expect(datesFrom('2026-11-02', '2026-11-01')).toEqual([]);
  });
});
