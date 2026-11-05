import type { Locale } from './locales';
import { ptBR } from './pt-BR';

export type TranslationValues = Record<string, string | number>;
export type Translate = (key: string, values?: TranslationValues) => string;

const dictionaries: Record<Locale, Record<string, string>> = {
  'en-US': {},
  'pt-BR': ptBR,
};

const PLACEHOLDER = /\{(\w{1,32})\}/g;

export const translate = (locale: Locale, key: string, values?: TranslationValues): string => {
  const template = dictionaries[locale][key] ?? key;

  return template.replace(PLACEHOLDER, (placeholder, name: string) =>
    values && name in values ? String(values[name]) : placeholder,
  );
};

export const translator =
  (locale: Locale): Translate =>
  (key, values) =>
    translate(locale, key, values);
