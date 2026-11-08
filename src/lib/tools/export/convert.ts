// Turns a .docx, .odt, .md, .txt or .html file into a title, an author and chapters ready for the
// ePub builder. Everything is read with plain string work (no DOMParser), so it runs the same in the
// browser and in Node, and the file never leaves the device.
import type { Chapter } from './text';
import { readZipAsync } from './unzip';
import { isZip, textOf, type ZipEntry } from './zip';

export type SourceFormat = 'docx' | 'odt' | 'md' | 'txt' | 'html';

export type ConvertedBook = { title: string; author: string; chapters: Chapter[] };

export type ConvertFailure = 'unsupported' | 'broken' | 'empty' | 'too-big';

export class ConvertError extends Error {
  readonly reason: ConvertFailure;

  constructor(reason: ConvertFailure) {
    super(`Conversion failed: ${reason}`);
    this.reason = reason;
  }
}

export const MAX_FILE_BYTES = 20 * 1024 * 1024;

export const ACCEPTED_EXTENSIONS = '.docx,.odt,.md,.markdown,.txt,.html,.htm,.xhtml';

// The pieces every reader produces before they become chapters. Level 0 is a "Title" style.
type Item = { kind: 'heading'; level: number; text: string } | { kind: 'paragraph'; text: string };

type Parsed = { items: Item[]; title: string; author: string };

const EXTENSION_FORMATS: Record<string, SourceFormat> = {
  docx: 'docx',
  odt: 'odt',
  md: 'md',
  markdown: 'md',
  txt: 'txt',
  html: 'html',
  htm: 'html',
  xhtml: 'html',
};

const BREAK_TEXT = '***';

export const formatOf = (fileName: string): SourceFormat | null => {
  const extension = /\.([a-z0-9]+)$/i.exec(fileName)?.[1].toLowerCase() ?? '';

  return EXTENSION_FORMATS[extension] ?? null;
};

export const baseName = (fileName: string): string => fileName.replace(/\.[^.]*$/, '').trim() || fileName;

// UTF-8 first; text that is not valid UTF-8 is almost always an old Windows file (windows-1252).
export const decodeText = (bytes: Uint8Array): string => {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return new TextDecoder('windows-1252').decode(bytes);
  }
};

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  hellip: '…',
  mdash: '—',
  ndash: '–',
  laquo: '«',
  raquo: '»',
  ldquo: '“',
  rdquo: '”',
  lsquo: '‘',
  rsquo: '’',
  ordf: 'ª',
  ordm: 'º',
  deg: '°',
  copy: '©',
  ccedil: 'ç',
  Ccedil: 'Ç',
};

const ACCENTS: Record<string, string> = {
  acute: '́',
  grave: '̀',
  circ: '̂',
  tilde: '̃',
  uml: '̈',
};

const namedEntity = (name: string): string | null => {
  const accented = /^([a-zA-Z])(acute|grave|circ|tilde|uml)$/.exec(name);

  if (accented) {
    return `${accented[1]}${ACCENTS[accented[2]]}`.normalize('NFC');
  }

  return NAMED_ENTITIES[name] ?? null;
};

export const decodeEntities = (text: string): string =>
  text.replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (whole: string, name: string) => {
    if (name.startsWith('#')) {
      const isHex = name[1] === 'x' || name[1] === 'X';
      const code = isHex ? parseInt(name.slice(2), 16) : parseInt(name.slice(1), 10);

      return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : whole;
    }

    return namedEntity(name) ?? whole;
  });

const stripTags = (xml: string): string => {
  let text = '';
  let insideTag = false;

  for (const character of xml) {
    if (character === '<') {
      insideTag = true;
    } else if (character === '>' && insideTag) {
      insideTag = false;
    } else if (!insideTag) {
      text += character;
    }
  }

  return text;
};

const tidy = (text: string): string =>
  text
    .split('\n')
    .map((line) => line.replace(/[ \t ]+/g, ' ').trim())
    .join('\n')
    .trim();

const metadataField = (xml: string, tags: string[]): string => {
  for (const tag of tags) {
    const match = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`).exec(xml);
    const value = match ? tidy(decodeEntities(stripTags(match[1]))) : '';

    if (value) {
      return value;
    }
  }

  return '';
};

const entryText = (entries: ZipEntry[], name: string): string => {
  const entry = entries.find((candidate) => candidate.name === name);

  return entry ? textOf(entry.data) : '';
};

// Word localizes style ids ("Heading1", "Ttulo1", "Titre1"); the names in styles.xml stay English.
// ODF writes spaces in style names as _20_ ("Heading_20_1").
const levelFromStyle = (style: string): number | null => {
  const plain = style
    .replace(/_20_/g, ' ')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
  const numbered = /^(?:heading|titulo|ttulo|titre|berschrift|uberschrift|kop|encabezado)([1-9])$/.exec(plain);

  if (numbered) {
    return Number(numbered[1]);
  }

  return plain === 'title' || plain === 'titulo' ? 0 : null;
};

const docxStyleLevels = (stylesXml: string): Map<string, number> => {
  const levels = new Map<string, number>();

  for (const style of stylesXml.matchAll(/<w:style\s[^>]*w:styleId="([^"]+)"[^>]*>([\s\S]*?)<\/w:style>/g)) {
    const name = /<w:name\s+w:val="([^"]+)"/.exec(style[2])?.[1] ?? '';
    const level = levelFromStyle(name);

    if (level !== null) {
      levels.set(style[1], level);
    }
  }

  return levels;
};

const docxParagraphText = (body: string): string =>
  [...body.matchAll(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>|<w:(tab|br|cr)(?:\s[^>]*)?\/>/g)]
    .map((token) => {
      if (token[2] === 'tab') {
        return ' ';
      }

      if (token[2]) {
        return '\n';
      }

      return decodeEntities(token[1]);
    })
    .join('');

const parseDocx = (entries: ZipEntry[]): Parsed => {
  const document = entryText(entries, 'word/document.xml');

  if (!document) {
    throw new ConvertError('broken');
  }

  const styleLevels = docxStyleLevels(entryText(entries, 'word/styles.xml'));
  const core = entryText(entries, 'docProps/core.xml');
  const items: Item[] = [];

  for (const paragraph of document.matchAll(/<w:p(?:\s[^>]*)?>([\s\S]*?)<\/w:p>/g)) {
    const properties = /<w:pPr>([\s\S]*?)<\/w:pPr>/.exec(paragraph[1])?.[1] ?? '';
    const style = /<w:pStyle\s+w:val="([^"]+)"/.exec(properties)?.[1] ?? '';
    const outline = /<w:outlineLvl\s+w:val="(\d)"/.exec(properties)?.[1];
    const level = styleLevels.get(style) ?? levelFromStyle(style) ?? (outline ? Number(outline) + 1 : null);
    const text = tidy(docxParagraphText(paragraph[1].replace(/<w:pPr>[\s\S]*?<\/w:pPr>/, '')));

    if (level !== null && text) {
      items.push({ kind: 'heading', level, text: text.replace(/\n+/g, ' ') });
    } else {
      items.push({ kind: 'paragraph', text });
    }
  }

  return {
    items,
    title: metadataField(core, ['dc:title']),
    author: metadataField(core, ['dc:creator']),
  };
};

const odtInlineText = (xml: string): string =>
  decodeEntities(
    stripTags(
      xml
        .replace(/<text:s\s+text:c="(\d+)"\s*\/>/g, (_whole, count: string) => ' '.repeat(Number(count)))
        .replace(/<text:(?:s|tab)\s*\/>/g, ' ')
        .replace(/<text:line-break\s*\/>/g, '\n'),
    ),
  );

// LibreOffice often writes headings as paragraphs whose style is, or inherits from, a heading style
// (an automatic "P1" with parent "Heading_20_1"), instead of text:h.
const odtStyleLevels = (xml: string): Map<string, number> => {
  const levels = new Map<string, number>();

  for (const style of xml.matchAll(/<style:style\s([^>]*)>/g)) {
    const name = /style:name="([^"]+)"/.exec(style[1])?.[1];
    const parent = /style:parent-style-name="([^"]+)"/.exec(style[1])?.[1] ?? '';
    const level = levelFromStyle(parent) ?? levelFromStyle(name ?? '');

    if (name && level !== null) {
      levels.set(name, level);
    }
  }

  return levels;
};

const parseOdt = (entries: ZipEntry[]): Parsed => {
  const content = entryText(entries, 'content.xml');

  if (!content) {
    throw new ConvertError('broken');
  }

  const meta = entryText(entries, 'meta.xml');
  const styleLevels = odtStyleLevels(`${entryText(entries, 'styles.xml')}${content}`);
  const body = content.replace(/<text:note\b[\s\S]*?<\/text:note>/g, '');
  const items: Item[] = [];

  for (const block of body.matchAll(/<text:([hp])(\s[^>]*)?>([\s\S]*?)<\/text:\1>/g)) {
    const attributes = block[2] ?? '';
    const text = tidy(odtInlineText(block[3]));
    const styleName = /text:style-name="([^"]+)"/.exec(attributes)?.[1] ?? '';
    const styleLevel = styleLevels.get(styleName) ?? levelFromStyle(styleName);

    if (block[1] === 'h' && text) {
      const level = Number(/text:outline-level="(\d+)"/.exec(attributes)?.[1] ?? '1');
      items.push({ kind: 'heading', level, text: text.replace(/\n+/g, ' ') });
    } else if (styleLevel !== null && text) {
      items.push({ kind: 'heading', level: styleLevel, text: text.replace(/\n+/g, ' ') });
    } else {
      items.push({ kind: 'paragraph', text });
    }
  }

  return {
    items,
    title: metadataField(meta, ['dc:title']),
    author: metadataField(meta, ['meta:initial-creator', 'dc:creator']),
  };
};

// Escaped characters are parked as private-use markers so the emphasis rules do not touch them.
const stripInlineMarkdown = (line: string): string =>
  line
    .replace(/\\([\\`*_{}[\]()#+\-.!~])/g, (_whole, character: string) => `\uE000${character.charCodeAt(0)}\uE001`)
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^[\]]+)\]\([^()]*\)/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/(\*\*|__)(.+?)\1/g, '$2')
    .replace(/~~(.+?)~~/g, '$1')
    .replace(/\*(?!\s)(.+?)\*/g, '$1')
    .replace(/(^|[^\p{L}\p{N}])_(?!\s)(.+?)_(?![\p{L}\p{N}])/gu, '$1$2')
    .replace(/\uE000(\d+)\uE001/g, (_whole, code: string) => String.fromCharCode(Number(code)));

const MARKDOWN_RULE = /^\s*([-*_])(?:\s*\1){2,}\s*$/;
const MARKDOWN_HEADING = /^(#{1,6})\s(.*)$/;

// "## Title ##" keeps only "Title".
const headingText = (raw: string): string => {
  let text = raw.trim();

  while (text.endsWith('#')) {
    text = text.slice(0, -1);
  }

  return text.trim();
};
// Lines that start their own paragraph even without a blank line: dialogue dashes and list items.
const PARAGRAPH_START = /^\s*(?:[-+*—–]\s|\d+[.)]\s)/;

const frontMatter = (lines: string[]): { title: string; author: string; skip: number } => {
  const closing =
    lines[0]?.trim() === '---' ? lines.findIndex((line, index) => index > 0 && line.trim() === '---') : -1;

  if (closing < 0) {
    return { title: '', author: '', skip: 0 };
  }

  const field = (key: string): string => {
    const line = lines.slice(1, closing).find((candidate) => new RegExp(`^${key}\\s*:`, 'i').test(candidate));

    return line
      ? line
          .replace(/^[^:]*:\s*/, '')
          .replace(/^["']|["']$/g, '')
          .trim()
      : '';
  };

  return { title: field('title'), author: field('author'), skip: closing + 1 };
};

const parseMarkdown = (text: string): Parsed => {
  const lines = text.split(/\r?\n/);
  const front = frontMatter(lines);
  const items: Item[] = [];
  let paragraph: string[] = [];

  const flush = (): void => {
    if (paragraph.length > 0) {
      items.push({ kind: 'paragraph', text: tidy(stripInlineMarkdown(paragraph.join(' '))) });
      paragraph = [];
    }
  };

  for (const line of lines.slice(front.skip)) {
    const heading = MARKDOWN_HEADING.exec(line);

    if (MARKDOWN_RULE.test(line)) {
      flush();
      items.push({ kind: 'paragraph', text: BREAK_TEXT });
    } else if (heading) {
      flush();
      items.push({
        kind: 'heading',
        level: heading[1].length,
        text: tidy(stripInlineMarkdown(headingText(heading[2]))),
      });
    } else if (line.trim() === '') {
      flush();
    } else {
      if (PARAGRAPH_START.test(line)) {
        flush();
      }

      paragraph.push(line.replace(/^\s*>\s?/, '').trim());
    }
  }

  flush();

  return { items, title: front.title, author: front.author };
};

const htmlInlineText = (html: string): string =>
  tidy(decodeEntities(stripTags(html.replace(/\s+/g, ' ').replace(/<br\s*\/?>/gi, '\n'))));

const parseHtml = (text: string): Parsed => {
  const title = htmlInlineText(/<title(?:\s[^>]*)?>([\s\S]*?)<\/title>/i.exec(text)?.[1] ?? '');
  const author = decodeEntities(/<meta\s+name=["']author["']\s+content=["']([^"']*)["']/i.exec(text)?.[1] ?? '').trim();
  const body = text
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<(script|style|head|template|noscript)\b[\s\S]*?<\/\1>/gi, '');
  const items: Item[] = [];

  for (const block of body.matchAll(/<(h[1-6]|p)(?:\s[^>]*)?>([\s\S]*?)<\/\1>|<hr\b[^>]*>/gi)) {
    if (!block[1]) {
      items.push({ kind: 'paragraph', text: BREAK_TEXT });
    } else if (block[1].toLowerCase() === 'p') {
      items.push({ kind: 'paragraph', text: htmlInlineText(block[2]) });
    } else {
      items.push({ kind: 'heading', level: Number(block[1][1]), text: htmlInlineText(block[2]).replace(/\n+/g, ' ') });
    }
  }

  if (items.length === 0) {
    const plain = htmlInlineText(body.replace(/<\/(?:div|li|section|article|blockquote|pre|td)>/gi, '<br>'));
    items.push(...plain.split('\n').map((line): Item => ({ kind: 'paragraph', text: line })));
  }

  return { items, title, author };
};

const TXT_NUMBERED_CHAPTER = /^(?:cap[ií]tulo|chapter|parte|part|livro|book)\s+(?:\d+|[ivxlcdm]+)\b/iu;
const TXT_NAMED_CHAPTER = /^(?:pr[oó]logo|ep[ií]logo|prologue|epilogue|introdu[cç][aã]o|interl[uú]dio)[:.]?$/iu;

// "Capítulo 1", "CAPÍTULO IV - O fim" or "Prólogo", in a short line of its own.
const isTxtChapter = (line: string): boolean => {
  if (line.length > 80) {
    return false;
  }

  const numbered = TXT_NUMBERED_CHAPTER.exec(line);

  if (!numbered) {
    return TXT_NAMED_CHAPTER.test(line);
  }

  const rest = line.slice(numbered[0].length).trim();

  return rest === '' || '-–—:.'.includes(rest[0]);
};

const parseTxt = (text: string): Parsed => ({
  items: text.split(/\r?\n/).map((raw): Item => {
    const line = raw.trim();

    return isTxtChapter(line) ? { kind: 'heading', level: 1, text: line } : { kind: 'paragraph', text: line };
  }),
  title: '',
  author: '',
});

// The highest heading level that is used becomes a chapter. A single top heading at the very start,
// followed by smaller ones, is the book title instead.
const assemble = (parsed: Parsed, fallbackTitle: string): ConvertedBook => {
  const items = parsed.items.filter((item) => item.text.length > 0);

  if (!items.some((item) => item.kind === 'paragraph')) {
    throw new ConvertError('empty');
  }

  const levels = [...new Set(items.flatMap((item) => (item.kind === 'heading' ? [item.level] : [])))].sort(
    (first, second) => first - second,
  );
  const topCount = items.filter((item) => item.kind === 'heading' && item.level === levels[0]).length;
  const titleHeading = levels.length > 1 && topCount === 1 && items[0].kind === 'heading' ? items[0].text : '';
  const chapterLevel = titleHeading ? levels[1] : levels[0];
  const title = parsed.title || titleHeading || fallbackTitle;
  const chapters: { title: string; lines: string[] }[] = [];

  for (const item of titleHeading ? items.slice(1) : items) {
    if (item.kind === 'heading' && item.level <= chapterLevel) {
      chapters.push({ title: item.text, lines: [] });
    } else {
      if (chapters.length === 0) {
        chapters.push({ title: titleHeading || title, lines: [] });
      }

      chapters[chapters.length - 1].lines.push(item.text);
    }
  }

  return {
    title,
    author: parsed.author,
    chapters: chapters.map((chapter) => ({ title: chapter.title, text: chapter.lines.join('\n') })),
  };
};

const parseZip = async (format: 'docx' | 'odt', bytes: Uint8Array): Promise<Parsed> => {
  if (!isZip(bytes)) {
    throw new ConvertError('broken');
  }

  let entries: ZipEntry[];

  try {
    entries = await readZipAsync(bytes);
  } catch {
    throw new ConvertError('broken');
  }

  return format === 'docx' ? parseDocx(entries) : parseOdt(entries);
};

const parseText = (format: 'md' | 'txt' | 'html', text: string): Parsed => {
  if (format === 'md') {
    return parseMarkdown(text);
  }

  return format === 'html' ? parseHtml(text) : parseTxt(text);
};

export const convertFile = async (fileName: string, bytes: Uint8Array): Promise<ConvertedBook> => {
  const format = formatOf(fileName);

  if (!format) {
    throw new ConvertError('unsupported');
  }

  if (bytes.length > MAX_FILE_BYTES) {
    throw new ConvertError('too-big');
  }

  const parsed =
    format === 'docx' || format === 'odt' ? await parseZip(format, bytes) : parseText(format, decodeText(bytes));

  return assemble(parsed, baseName(fileName));
};
