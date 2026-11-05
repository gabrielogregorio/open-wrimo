import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { STATUS_LABELS } from '@/components/book-status';
import { THEME_NAMES } from '@/components/preferences-menu';
import { EMAIL_TAKEN, INVALID_CREDENTIALS, TOO_MANY_ATTEMPTS } from '@/lib/auth/service';
import { BOOK_NOT_FOUND } from '@/lib/books/service';
import { ptBR } from './pt-BR';
import { translate, translator } from './translate';

const SOURCE_ROOT = join(process.cwd(), 'src');
const TRANSLATE_CALL = /\bt\(\s*'([^']+)'/g;
const ERROR_MESSAGE = /error: '([^']+)'/g;
const PAGE_MESSAGE = /^const PAGE_\w+ = '([^']+)'/gm;
const PAGE_NUMBER_MESSAGE = /pageNumber\(\d+, '([^']+)'\)/g;

const sourceFiles = (directory: string): string[] =>
  readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);

    if (entry.isDirectory()) {
      return sourceFiles(path);
    }

    return /\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name) ? [path] : [];
  });

const keysIn = (pattern: RegExp, files: string[]): string[] =>
  files.flatMap((file) => [...readFileSync(file, 'utf8').matchAll(pattern)].map((match) => match[1]));

describe('translate', () => {
  it('uses the English text as the key', () => {
    expect(translate('en-US', 'Sign in')).toBe('Sign in');
  });

  it('translates to Brazilian Portuguese', () => {
    expect(translate('pt-BR', 'Sign in')).toBe('Entrar');
  });

  it('fills placeholders and keeps unknown ones visible', () => {
    expect(translate('pt-BR', 'Page {page} of {total} · {percent}%', { page: 3, total: 10, percent: 30 })).toBe(
      'Página 3 de 10 · 30%',
    );
    expect(translate('en-US', 'Hello, {name}')).toBe('Hello, {name}');
  });

  it('falls back to the key when a translation is missing', () => {
    expect(translator('pt-BR')('A sentence nobody translated')).toBe('A sentence nobody translated');
  });
});

describe('pt-BR dictionary', () => {
  const files = sourceFiles(SOURCE_ROOT);
  const libraryFiles = files.filter((file) => file.includes(`${join('src', 'lib')}`));
  const keys = new Set([
    ...keysIn(TRANSLATE_CALL, files),
    ...keysIn(ERROR_MESSAGE, libraryFiles).filter((key) => !key.startsWith('must ')),
    ...keysIn(PAGE_MESSAGE, libraryFiles),
    ...keysIn(PAGE_NUMBER_MESSAGE, libraryFiles),
    ...Object.values(STATUS_LABELS),
    ...Object.values(THEME_NAMES),
    INVALID_CREDENTIALS,
    TOO_MANY_ATTEMPTS,
    EMAIL_TAKEN,
    BOOK_NOT_FOUND,
  ]);

  it('finds the texts used by the interface', () => {
    expect(keys.size).toBeGreaterThan(80);
  });

  it.each([...keys])('translates "%s"', (key) => {
    expect(ptBR[key]).toBeTruthy();
  });

  it('keeps the same placeholders in each translation', () => {
    const placeholders = (text: string): string[] => [...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();
    const mismatched = Object.entries(ptBR).filter(
      ([key, value]) => placeholders(key).join() !== placeholders(value).join(),
    );

    expect(mismatched).toEqual([]);
  });

  it('has no leftover translation', () => {
    expect(Object.keys(ptBR).filter((key) => !keys.has(key))).toEqual([]);
  });
});
