import { formatDay, formatMonth, formatNumber, formatShortDay } from './format';

describe('formatting', () => {
  it('writes numbers the local way', () => {
    expect(formatNumber('en-US', 50000)).toBe('50,000');
    expect(formatNumber('pt-BR', 50000)).toBe('50.000');
  });

  it('writes calendar dates without shifting the day', () => {
    expect(formatDay('en-US', '2026-11-05')).toBe('Nov 5, 2026');
    expect(formatDay('pt-BR', '2026-11-05')).toBe('5 de nov. de 2026');
    expect(formatShortDay('en-US', '2026-11-30')).toBe('Nov 30');
    expect(formatMonth('pt-BR', '2026-12')).toBe('dezembro de 2026');
    expect(formatMonth('en-US', '2026-01')).toBe('January 2026');
  });
});
