export const THEMES = ['system', 'light', 'dark', 'night'] as const;
export type Theme = (typeof THEMES)[number];

export const DEFAULT_THEME: Theme = 'system';
export const THEME_COOKIE = 'folio-theme';
export const PREFERENCE_MAX_AGE_SECONDS = 365 * 24 * 60 * 60;

export const isTheme = (value: unknown): value is Theme => THEMES.includes(value as Theme);

export const resolveTheme = (value: string | undefined): Theme => (isTheme(value) ? value : DEFAULT_THEME);
