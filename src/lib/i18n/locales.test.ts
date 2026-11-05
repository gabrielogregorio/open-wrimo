import { localeFromAcceptLanguage, normalizeLocale, resolveLocale } from './locales';

describe('normalizeLocale', () => {
  it.each([
    ['pt-BR', 'pt-BR'],
    ['pt', 'pt-BR'],
    [' PT-pt ', 'pt-BR'],
    ['en', 'en-US'],
    ['en-GB', 'en-US'],
    ['fr', null],
    ['', null],
    [null, null],
    [undefined, null],
  ])('reads "%s" as %s', (value, locale) => {
    expect(normalizeLocale(value)).toBe(locale);
  });
});

describe('localeFromAcceptLanguage', () => {
  it.each([
    ['pt-BR,pt;q=0.9,en;q=0.8', 'pt-BR'],
    ['en;q=0.4, pt-BR;q=0.9', 'pt-BR'],
    ['fr-FR,fr;q=0.9,en;q=0.5', 'en-US'],
    ['en,pt', 'en-US'],
    ['pt;q=abc, en;q=0.1', 'en-US'],
    ['de,fr', null],
    [null, null],
  ])('picks a locale from "%s"', (header, locale) => {
    expect(localeFromAcceptLanguage(header)).toBe(locale);
  });
});

describe('resolveLocale', () => {
  it('prefers the query over the saved choice and the browser', () => {
    expect(resolveLocale({ query: 'en', saved: 'pt-BR', acceptLanguage: 'pt-BR' })).toBe('en-US');
  });

  it('prefers the saved choice over the browser', () => {
    expect(resolveLocale({ query: null, saved: 'pt-BR', acceptLanguage: 'en-US' })).toBe('pt-BR');
  });

  it('falls back to the browser and then to English', () => {
    expect(resolveLocale({ query: 'xx', saved: undefined, acceptLanguage: 'pt' })).toBe('pt-BR');
    expect(resolveLocale({ query: null, saved: undefined, acceptLanguage: null })).toBe('en-US');
  });
});
