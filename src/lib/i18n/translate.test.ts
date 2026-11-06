import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import {
  EVENT_LABELS,
  GENRE_SUGGESTIONS,
  GOAL_FILTER_LABELS,
  MOOD_LABELS,
  PERIOD_LABELS,
  PERIOD_SUFFIX,
  PROJECT_STATUS_LABELS,
  PROJECT_TYPE_LABELS,
  UNIT_LABELS,
} from '@/components/writing-labels';
import { EMAIL_TAKEN, INVALID_CREDENTIALS, TOO_MANY_ATTEMPTS, USERNAME_TAKEN } from '@/lib/auth/service';
import { LIFETIME_BADGES, PARTICIPATION_BADGES, PERSONAL_BADGES, WRITING_BADGES } from '@/lib/writing/badges';
import { EVENTS } from '@/lib/writing/events';
import { IMAGE_STILL_TOO_BIG, IMAGE_UNREADABLE, IMAGE_UPLOAD_TOO_BIG, IMAGE_WRONG_TYPE } from '@/lib/storage/images';
import {
  GOAL_NOT_FOUND,
  IMAGE_NOT_STORED,
  POST_NOT_FOUND,
  PROJECT_NOT_FOUND,
  UPLOADS_TOO_FAST,
} from '@/lib/writing/service';
import { SITE_DESCRIPTION } from '@/server/seo';
import { ptBR } from './pt-BR';
import { translate, translator } from './translate';

const SOURCE_ROOT = join(process.cwd(), 'src');
const TRANSLATE_CALL = /\bt\(\s*'([^']+)'/g;
const ERROR_MESSAGE = /error: '([^']+)'/g;
const PAGE_MESSAGE = /^const PAGE_\w+ = '([^']+)'/gm;
const LABEL_MAP = /_(?:LABELS|NAMES)\b[^=\n]*=\s*\{([^}]*)\}/g;
const MAP_VALUE = /:\s*'([^']+)'/g;
const ERROR_CONSTANT = /^const \w+_ERROR = '([^']+)'/gm;
const PAGE_NUMBER_MESSAGE = /pageNumber\(\d+, '([^']+)'\)/g;
const HELPER_MESSAGE = /\b(?:text\(\d+|optionalUrl\(|isoDate\(|count\(\w+),?\s*'([^']+)'\)/g;

const sourceFiles = (directory: string): string[] =>
  readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);

    if (entry.isDirectory()) {
      return sourceFiles(path);
    }

    return /\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name) ? [path] : [];
  });

const mapValuesIn = (files: string[]): string[] =>
  files.flatMap((file) =>
    [...readFileSync(file, 'utf8').matchAll(LABEL_MAP)].flatMap((map) =>
      [...map[1].matchAll(MAP_VALUE)].map((match) => match[1]),
    ),
  );

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
    expect(translate('pt-BR', 'Page {page} of {total}', { page: 3, total: 10 })).toBe('Página 3 de 10');
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
    ...keysIn(ERROR_MESSAGE, libraryFiles).filter((key) => !key.startsWith('must ') && !key.startsWith('is required')),
    ...keysIn(PAGE_MESSAGE, libraryFiles),
    ...keysIn(PAGE_NUMBER_MESSAGE, libraryFiles),
    ...keysIn(HELPER_MESSAGE, libraryFiles),
    ...keysIn(ERROR_CONSTANT, libraryFiles),
    ...mapValuesIn(files),
    ...[PROJECT_STATUS_LABELS, PROJECT_TYPE_LABELS, UNIT_LABELS, MOOD_LABELS, EVENT_LABELS, GOAL_FILTER_LABELS].flatMap(
      (labels) => Object.values(labels),
    ),
    ...Object.values(PERIOD_LABELS),
    ...Object.values(PERIOD_SUFFIX),
    ...GENRE_SUGGESTIONS,
    ...EVENTS.map((event) => event.name),
    ...[...WRITING_BADGES, ...LIFETIME_BADGES, ...PERSONAL_BADGES, ...PARTICIPATION_BADGES].flatMap((badge) => [
      badge.label,
      badge.description,
    ]),
    INVALID_CREDENTIALS,
    TOO_MANY_ATTEMPTS,
    EMAIL_TAKEN,
    USERNAME_TAKEN,
    SITE_DESCRIPTION,
    PROJECT_NOT_FOUND,
    GOAL_NOT_FOUND,
    IMAGE_UPLOAD_TOO_BIG,
    IMAGE_STILL_TOO_BIG,
    IMAGE_UNREADABLE,
    IMAGE_WRONG_TYPE,
    UPLOADS_TOO_FAST,
    IMAGE_NOT_STORED,
    POST_NOT_FOUND,
    'Enter how much you wrote.',
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
