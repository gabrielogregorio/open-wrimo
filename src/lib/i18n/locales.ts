export const LOCALES = ['en-US', 'pt-BR'] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'en-US';
export const LOCALE_COOKIE = 'openwrimo-locale';
export const LOCALE_HEADER = 'x-openwrimo-locale';
export const LOCALE_QUERY = 'lang';
export const PREFERENCE_MAX_AGE_SECONDS = 365 * 24 * 60 * 60;

const MAX_LANGUAGE_TAGS = 16;

export const normalizeLocale = (value: string | null | undefined): Locale | null => {
  const tag = value?.trim().toLowerCase() ?? '';

  if (tag.startsWith('pt')) {
    return 'pt-BR';
  }

  if (tag.startsWith('en')) {
    return 'en-US';
  }

  return null;
};

export const localeFromAcceptLanguage = (header: string | null): Locale | null => {
  const ranked = (header ?? '')
    .split(',')
    .slice(0, MAX_LANGUAGE_TAGS)
    .map((entry, position) => {
      const [tag, ...parameters] = entry.split(';');
      const quality = parameters.find((parameter) => parameter.trim().startsWith('q='));

      return { tag, position, quality: quality ? Number(quality.trim().slice(2)) || 0 : 1 };
    })
    .sort((first, second) => second.quality - first.quality || first.position - second.position);

  for (const { tag } of ranked) {
    const locale = normalizeLocale(tag);

    if (locale) {
      return locale;
    }
  }

  return null;
};

export type LocaleSources = { query: string | null; saved: string | undefined; acceptLanguage: string | null };

export const resolveLocale = ({ query, saved, acceptLanguage }: LocaleSources): Locale =>
  normalizeLocale(query) ?? normalizeLocale(saved) ?? localeFromAcceptLanguage(acceptLanguage) ?? DEFAULT_LOCALE;
