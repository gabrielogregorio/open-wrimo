import type { Locale } from './locales';
import { ptBR } from './pt-BR';

export type TranslationValues = Record<string, string | number>;
export type Translate = (key: string, values?: TranslationValues) => string;

const dictionaries: Record<Locale, Record<string, string>> = {
  'en-US': {},
  'pt-BR': ptBR,
};

const PLACEHOLDER = /\{(\w{1,32})\}/g;
// "{count:palavra|palavras}" picks the singular when count is exactly 1 and the plural otherwise (0 too).
const PLURAL = /\{(\w{1,32}):([^|{}]{0,80})\|([^|{}]{0,80})\}/g;

// Counts may arrive already formatted for pt-BR ("1.234"), so dots are thousands separators here.
const numberOf = (value: string | number): number =>
  typeof value === 'number' ? value : Number(value.replaceAll('.', '').replace(',', '.'));

export const translate = (locale: Locale, key: string, values?: TranslationValues): string => {
  const template = dictionaries[locale][key] ?? key;

  return template
    .replace(PLURAL, (choice, name: string, singular: string, plural: string) => {
      if (!values || !(name in values)) {
        return choice;
      }

      return numberOf(values[name]) === 1 ? singular : plural;
    })
    .replace(PLACEHOLDER, (placeholder, name: string) =>
      values && name in values ? String(values[name]) : placeholder,
    );
};

export const translator =
  (locale: Locale): Translate =>
  (key, values) =>
    translate(locale, key, values);
