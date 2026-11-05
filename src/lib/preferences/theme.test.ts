import { DEFAULT_THEME, isTheme, resolveTheme } from './theme';

describe('theme preference', () => {
  it.each(['system', 'light', 'dark', 'night'])('accepts "%s"', (theme) => {
    expect(isTheme(theme)).toBe(true);
    expect(resolveTheme(theme)).toBe(theme);
  });

  it.each([undefined, '', 'blue', 'NIGHT'])('falls back to the system for %s', (value) => {
    expect(resolveTheme(value)).toBe(DEFAULT_THEME);
  });

  it('follows the system by default', () => {
    expect(DEFAULT_THEME).toBe('system');
  });
});
