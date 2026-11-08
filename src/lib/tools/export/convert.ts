// Turns a .docx, .odt, .md, .txt or .html file into a title, an author and chapters ready for the
// ePub builder. Everything is read with plain string work (no DOMParser), so it runs the same in the
// browser and in Node, and the file never leaves the device.
import {
  ImageStore,
  PLAIN,
  attribute,
  cellRuns,
  markupTokens,
  mediaTypeOf,
  runsText,
  splitAtImages,
  splitElements,
  storeDataUri,
  tableParagraph,
  textRun,
  type BookImage,
  type Format,
  type Inline,
  type InlineParagraph,
} from './rich';
import { blocksOf, type Chapter, type RichBlock, type Run } from './text';
import { readZipAsync } from './unzip';
import { isZip, textOf, type ZipEntry } from './zip';

export type SourceFormat = 'docx' | 'odt' | 'md' | 'txt' | 'html';

// images and skippedImages only appear when the file had images.
export type ConvertedBook = {
  title: string;
  author: string;
  chapters: Chapter[];
  images?: BookImage[];
  skippedImages?: number;
};

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
// A paragraph has a block when it holds formatting, an image or a table.
type Item = { kind: 'heading'; level: number; text: string } | ({ kind: 'paragraph' } & InlineParagraph);

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

const OFF_VALUES = new Set(['0', 'false', 'off']);

// <w:b/> turns bold on, <w:b w:val="0"/> turns it off, no tag keeps what the style says.
const docxFlag = (properties: string, tag: 'b' | 'i'): boolean | null => {
  const match = new RegExp(`<w:${tag}(?:\\s[^>]*)?/>`).exec(properties);

  return match ? !OFF_VALUES.has(attribute(match[0], 'w:val').toLowerCase()) : null;
};

const docxFormat = (properties: string, base: Format): Format => ({
  bold: docxFlag(properties, 'b') ?? base.bold,
  italic: docxFlag(properties, 'i') ?? base.italic,
});

const runProperties = (xml: string): string => /<w:rPr>([\s\S]*?)<\/w:rPr>/.exec(xml)?.[1] ?? '';

// Character and paragraph styles that make text bold or italic, such as "Strong" or "Emphasis".
const docxStyleFormats = (stylesXml: string): Map<string, Format> => {
  const formats = new Map<string, Format>();

  for (const style of stylesXml.matchAll(/<w:style\s[^>]*w:styleId="([^"]+)"[^>]*>([\s\S]*?)<\/w:style>/g)) {
    const format = docxFormat(runProperties(style[2]), PLAIN);

    if (format.bold || format.italic) {
      formats.set(style[1], format);
    }
  }

  return formats;
};

type DocxContext = {
  entries: ZipEntry[];
  formats: Map<string, Format>;
  targets: Map<string, string>;
  store: ImageStore | null;
};

// "media/image1.png" from word/document.xml is word/media/image1.png; "/word/..." starts at the root.
const zipPath = (folder: string, target: string): string => {
  const segments = target.startsWith('/') || !folder ? [] : folder.split('/');

  for (const segment of target.split('/')) {
    if (segment === '..') {
      segments.pop();
    } else if (segment && segment !== '.') {
      segments.push(segment);
    }
  }

  return segments.join('/');
};

const docxTargets = (relsXml: string): Map<string, string> => {
  const targets = new Map<string, string>();

  for (const relation of relsXml.matchAll(/<Relationship\s[^>]*>/g)) {
    if (attribute(relation[0], 'TargetMode') !== 'External') {
      targets.set(attribute(relation[0], 'Id'), zipPath('word', attribute(relation[0], 'Target')));
    }
  }

  return targets;
};

// Places a picture of the document in the store; pictures that are missing count as skipped.
const zipImage = (entries: ZipEntry[], store: ImageStore, path: string, alt: string): Inline[] => {
  const entry = entries.find((candidate) => candidate.name === path);

  if (!entry) {
    store.skipped += 1;

    return [];
  }

  const src = store.add(entry.data, mediaTypeOf(path), path);

  return src ? [{ kind: 'image', src, alt }] : [];
};

const docxImages = (runXml: string, context: DocxContext): Inline[] => {
  const store = context.store;

  if (!store) {
    return [];
  }

  const alt = attribute(/<wp:docPr\b[^>]*>/.exec(runXml)?.[0] ?? '', 'descr');
  const ids = new Set(
    [...runXml.matchAll(/<(?:a:blip|v:imagedata)\b[^>]*>/g)].map(
      (tag) => attribute(tag[0], 'r:embed') || attribute(tag[0], 'r:id'),
    ),
  );

  return [...ids].flatMap((id) => {
    const path = context.targets.get(id);

    return path ? zipImage(context.entries, store, path, decodeEntities(alt)) : [];
  });
};

const docxInlines = (paragraphXml: string, context: DocxContext, base: Format): Inline[] =>
  [...paragraphXml.matchAll(/<w:r(?:\s[^>]*)?>([\s\S]*?)<\/w:r>/g)].flatMap((run) => {
    const properties = runProperties(run[1]);
    const style = /<w:rStyle\s+w:val="([^"]+)"/.exec(properties)?.[1] ?? '';
    const format = docxFormat(properties, context.formats.get(style) ?? base);

    return [textRun(docxParagraphText(run[1]), format), ...docxImages(run[1], context)];
  });

const docxParagraphFormat = (paragraphXml: string, context: DocxContext): Format => {
  const style = /<w:pStyle\s+w:val="([^"]+)"/.exec(paragraphXml)?.[1] ?? '';

  return context.formats.get(style) ?? PLAIN;
};

const docxCellRuns = (cellXml: string, context: DocxContext): Run[] => {
  const cellContext = { ...context, store: null };
  const inlines = [...cellXml.matchAll(/<w:p(?:\s[^>]*)?>([\s\S]*?)<\/w:p>/g)].flatMap((paragraph, index) => [
    ...(index > 0 ? [textRun('\n', PLAIN)] : []),
    ...docxInlines(paragraph[1], cellContext, docxParagraphFormat(paragraph[1], context)),
  ]);

  return cellRuns(inlines);
};

const docxTable = (tableXml: string, context: DocxContext): Item => {
  const rows = [...tableXml.matchAll(/<w:tr(?:\s[^>]*)?>([\s\S]*?)<\/w:tr>/g)].map((row) =>
    [...row[1].matchAll(/<w:tc(?:\s[^>]*)?>([\s\S]*?)<\/w:tc>/g)].map((cell) => docxCellRuns(cell[1], context)),
  );

  return { kind: 'paragraph', ...tableParagraph(rows) };
};

const docxParagraphs = (xml: string, context: DocxContext, styleLevels: Map<string, number>): Item[] =>
  [...xml.matchAll(/<w:p(?:\s[^>]*)?>([\s\S]*?)<\/w:p>/g)].flatMap((paragraph): Item[] => {
    const properties = /<w:pPr>([\s\S]*?)<\/w:pPr>/.exec(paragraph[1])?.[1] ?? '';
    const style = /<w:pStyle\s+w:val="([^"]+)"/.exec(properties)?.[1] ?? '';
    const outline = /<w:outlineLvl\s+w:val="(\d)"/.exec(properties)?.[1];
    const level = styleLevels.get(style) ?? levelFromStyle(style) ?? (outline ? Number(outline) + 1 : null);
    const body = paragraph[1].replace(/<w:pPr>[\s\S]*?<\/w:pPr>/, '');

    if (level !== null) {
      const text = tidy(docxParagraphText(body)).replace(/\n+/g, ' ');

      return [text ? { kind: 'heading', level, text } : { kind: 'paragraph', text }];
    }

    return splitAtImages(docxInlines(body, context, context.formats.get(style) ?? PLAIN)).map((item): Item => ({
      kind: 'paragraph',
      ...item,
    }));
  });

const parseDocx = (entries: ZipEntry[], store: ImageStore): Parsed => {
  const document = entryText(entries, 'word/document.xml');

  if (!document) {
    throw new ConvertError('broken');
  }

  const stylesXml = entryText(entries, 'word/styles.xml');
  const styleLevels = docxStyleLevels(stylesXml);
  const context: DocxContext = {
    entries,
    formats: docxStyleFormats(stylesXml),
    targets: docxTargets(entryText(entries, 'word/_rels/document.xml.rels')),
    store,
  };
  const core = entryText(entries, 'docProps/core.xml');
  const items = splitElements(document, 'w:tbl').flatMap((part) =>
    part.inside ? [docxTable(part.xml, context)] : docxParagraphs(part.xml, context, styleLevels),
  );

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

// A partial format: null means "inherit".
type StyleFormat = { bold: boolean | null; italic: boolean | null; parent: string };

const odtWeight = (properties: string): boolean | null => {
  const weight = attribute(properties, 'fo:font-weight');

  if (!weight) {
    return null;
  }

  return weight === 'bold' || Number(weight) >= 600;
};

const odtStyle = (properties: string): boolean | null => {
  const style = attribute(properties, 'fo:font-style');

  return style ? style !== 'normal' : null;
};

// Automatic styles ("T1") and named ones ("Strong_20_Emphasis") with their parents resolved.
const odtTextFormats = (xml: string): Map<string, StyleFormat> => {
  const raw = new Map<string, StyleFormat>();

  for (const style of xml.matchAll(/<style:style\s([^>]*?)(?:\/>|>([\s\S]*?)<\/style:style>)/g)) {
    const properties = /<style:text-properties\s[^>]*>/.exec(style[2] ?? '')?.[0] ?? '';
    raw.set(attribute(style[0], 'style:name'), {
      bold: odtWeight(properties),
      italic: odtStyle(properties),
      parent: attribute(style[0], 'style:parent-style-name'),
    });
  }

  const resolve = (name: string, depth: number): StyleFormat => {
    const own = raw.get(name);

    if (!own || depth > 8 || !own.parent) {
      return own ?? { bold: null, italic: null, parent: '' };
    }

    const parent = resolve(own.parent, depth + 1);

    return { bold: own.bold ?? parent.bold, italic: own.italic ?? parent.italic, parent: own.parent };
  };

  return new Map([...raw.keys()].map((name) => [name, resolve(name, 0)]));
};

type OdtContext = { entries: ZipEntry[]; formats: Map<string, StyleFormat>; store: ImageStore | null };

const withStyle = (format: Format, style: StyleFormat | undefined): Format => ({
  bold: style?.bold ?? format.bold,
  italic: style?.italic ?? format.italic,
});

// Walks the inline xml of one paragraph: nested spans, spaces, line breaks and pictures in frames,
// whose title and description become the alt text.
class OdtInlineReader {
  private readonly inlines: Inline[] = [];
  private readonly stack: Format[];
  private frame: { href: string; alt: string } | null = null;

  constructor(
    private readonly context: OdtContext,
    base: Format,
  ) {
    this.stack = [base];
  }

  read(xml: string): Inline[] {
    for (const token of markupTokens(xml)) {
      if (token.startsWith('<')) {
        this.tag(token);
      } else {
        this.text(decodeEntities(token));
      }
    }

    return this.inlines;
  }

  private get format(): Format {
    return this.stack[this.stack.length - 1];
  }

  private text(text: string): void {
    if (this.frame) {
      this.frame.alt += text;
    } else {
      this.inlines.push(textRun(text, this.format));
    }
  }

  private tag(tag: string): void {
    const name = /^<\/?([\w:-]+)/.exec(tag)?.[1] ?? '';
    const closing = tag.startsWith('</');

    if (name === 'text:span') {
      this.span(tag, closing);
    } else if (name === 'text:s') {
      this.text(' '.repeat(Number(attribute(tag, 'text:c') || '1')));
    } else if (name === 'text:tab') {
      this.text(' ');
    } else if (name === 'text:line-break') {
      this.text('\n');
    } else if (name === 'draw:frame' || name === 'draw:image') {
      this.picture(tag, closing);
    }
  }

  private span(tag: string, closing: boolean): void {
    if (closing) {
      this.stack.length = Math.max(1, this.stack.length - 1);
    } else if (!tag.endsWith('/>')) {
      this.stack.push(withStyle(this.format, this.context.formats.get(attribute(tag, 'text:style-name'))));
    }
  }

  private picture(tag: string, closing: boolean): void {
    if (!closing && tag.startsWith('<draw:frame')) {
      this.frame = { href: '', alt: '' };
    } else if (!closing && this.frame) {
      this.frame.href = attribute(tag, 'xlink:href');
    } else if (closing && tag.startsWith('</draw:frame') && this.frame) {
      const { href, alt } = this.frame;
      this.frame = null;
      const store = this.context.store;

      if (store && href) {
        this.inlines.push(...zipImage(this.context.entries, store, zipPath('', href), tidy(alt)));
      }
    }
  }
}

const odtCellRuns = (cellXml: string, context: OdtContext): Run[] => {
  const cellContext = { ...context, store: null };
  const inlines = [...cellXml.matchAll(/<text:([hp])(\s[^>]*)?>([\s\S]*?)<\/text:\1>/g)].flatMap((block, index) => [
    ...(index > 0 ? [textRun('\n', PLAIN)] : []),
    ...new OdtInlineReader(
      cellContext,
      withStyle(PLAIN, context.formats.get(attribute(block[0], 'text:style-name'))),
    ).read(block[3]),
  ]);

  return cellRuns(inlines);
};

const odtTable = (tableXml: string, context: OdtContext): Item => {
  const rows = [...tableXml.matchAll(/<table:table-row(?:\s[^>]*)?>([\s\S]*?)<\/table:table-row>/g)].map((row) =>
    [...row[1].matchAll(/<table:table-cell(?:\s[^>]*)?>([\s\S]*?)<\/table:table-cell>/g)].map((cell) =>
      odtCellRuns(cell[1], context),
    ),
  );

  return { kind: 'paragraph', ...tableParagraph(rows) };
};

const odtBlock = (block: RegExpExecArray, context: OdtContext, styleLevels: Map<string, number>): Item[] => {
  const attributes = block[2] ?? '';
  const text = tidy(odtInlineText(block[3]));
  const styleName = /text:style-name="([^"]+)"/.exec(attributes)?.[1] ?? '';
  const styleLevel = styleLevels.get(styleName) ?? levelFromStyle(styleName);

  if (block[1] === 'h' && text) {
    const level = Number(/text:outline-level="(\d+)"/.exec(attributes)?.[1] ?? '1');

    return [{ kind: 'heading', level, text: text.replace(/\n+/g, ' ') }];
  }

  if (styleLevel !== null && text) {
    return [{ kind: 'heading', level: styleLevel, text: text.replace(/\n+/g, ' ') }];
  }

  const base = withStyle(PLAIN, context.formats.get(styleName));
  const inlines = new OdtInlineReader(context, base).read(block[3]);

  return splitAtImages(inlines).map((item): Item => ({ kind: 'paragraph', ...item }));
};

const parseOdt = (entries: ZipEntry[], store: ImageStore): Parsed => {
  const content = entryText(entries, 'content.xml');

  if (!content) {
    throw new ConvertError('broken');
  }

  const meta = entryText(entries, 'meta.xml');
  const allStyles = `${entryText(entries, 'styles.xml')}${content}`;
  const styleLevels = odtStyleLevels(allStyles);
  const context: OdtContext = { entries, formats: odtTextFormats(allStyles), store };
  const body = content.replace(/<text:note\b[\s\S]*?<\/text:note>/g, '');
  const items = splitElements(body, 'table:table').flatMap((part): Item[] =>
    part.inside
      ? [odtTable(part.xml, context)]
      : [...part.xml.matchAll(/<text:([hp])(\s[^>]*)?>([\s\S]*?)<\/text:\1>/g)].flatMap((block) =>
          odtBlock(block, context, styleLevels),
        ),
  );

  return {
    items,
    title: metadataField(meta, ['dc:title']),
    author: metadataField(meta, ['meta:initial-creator', 'dc:creator']),
  };
};

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

const MARKDOWN_ESCAPABLE = '\\`*_{}[]()#+-.!~|';
const WORD_CHARACTER = /[\p{L}\p{N}]/u;

// Reads the inline markdown of one paragraph: **bold**, *italic* and _italic_ become runs, links keep
// their text, code keeps its text, ~~ is dropped and data URI images go to the store. A remote image
// keeps only its alt text, since the converter never downloads anything.
class MarkdownInlineReader {
  private readonly inlines: Inline[] = [];
  private readonly linkEnds = new Map<number, number>();
  private format: Format = PLAIN;
  private pending = '';

  constructor(
    private readonly source: string,
    private readonly store: ImageStore | null,
  ) {}

  read(): Inline[] {
    let index = 0;

    while (index < this.source.length) {
      index = this.step(index);
    }

    this.flush();

    return this.inlines;
  }

  private flush(): void {
    if (this.pending) {
      this.inlines.push(textRun(this.pending, this.format));
      this.pending = '';
    }
  }

  private literal(text: string, index: number): number {
    this.pending += text;

    return index + text.length;
  }

  private step(index: number): number {
    const character = this.source[index];
    const next = this.source[index + 1] ?? '';
    const linkEnd = this.linkEnds.get(index);

    if (linkEnd !== undefined) {
      return linkEnd;
    }

    if (character === '\\' && next && MARKDOWN_ESCAPABLE.includes(next)) {
      return this.literal(next, index + 1);
    }

    if (character === '`') {
      return this.code(index);
    }

    if (character === '!' && next === '[') {
      return this.image(index);
    }

    if (character === '[') {
      return this.link(index);
    }

    if (character === '~' && next === '~') {
      return index + 2;
    }

    if (character === '*' || character === '_') {
      return this.emphasis(index);
    }

    return this.literal(character, index);
  }

  private code(index: number): number {
    const close = this.source.indexOf('`', index + 1);

    if (close < 0) {
      return this.literal('`', index);
    }

    this.pending += this.source.slice(index + 1, close);

    return close + 1;
  }

  // The end of "[text](url)": the position of "](" and the position after ")".
  private target(from: number): { close: number; end: number } | null {
    const close = this.source.indexOf('](', from);
    const paren = close < 0 ? -1 : this.source.indexOf(')', close + 2);

    return paren < 0 ? null : { close, end: paren + 1 };
  }

  private link(index: number): number {
    const target = this.target(index);

    if (target) {
      this.linkEnds.set(target.close, target.end);

      return index + 1;
    }

    return this.literal('[', index);
  }

  private image(index: number): number {
    const target = this.target(index + 2);

    if (!target) {
      return this.literal('!', index);
    }

    const alt = this.source.slice(index + 2, target.close);
    const url = this.source
      .slice(target.close + 2, target.end - 1)
      .trim()
      .split(/\s+/)[0];
    const src = this.store ? storeDataUri(this.store, url) : null;

    if (src) {
      this.flush();
      this.inlines.push({ kind: 'image', src, alt });
    } else {
      this.pending += alt;
    }

    return target.end;
  }

  private emphasis(index: number): number {
    const character = this.source[index];
    const marker = this.source[index + 1] === character ? character.repeat(2) : character;
    const key = marker.length === 2 ? 'bold' : 'italic';
    const after = this.source[index + marker.length] ?? '';
    const isUnderscore = character === '_';

    if (this.format[key] ? isUnderscore && WORD_CHARACTER.test(after) : !this.opens(index, marker)) {
      return this.literal(marker, index);
    }

    this.flush();
    this.format = { ...this.format, [key]: !this.format[key] };

    return index + marker.length;
  }

  // An opening marker is followed by text and closed later; "_" also needs a word boundary before it.
  private opens(index: number, marker: string): boolean {
    const after = this.source[index + marker.length] ?? '';
    const before = this.source[index - 1] ?? '';

    if (!after.trim() || (marker[0] === '_' && WORD_CHARACTER.test(before))) {
      return false;
    }

    return this.closes(marker, index + marker.length + 1);
  }

  // A closing "_" is not followed by a letter or digit (snake_case stays as it is).
  private closes(marker: string, from: number): boolean {
    let position = this.source.indexOf(marker, from);

    while (position >= 0) {
      if (marker[0] !== '_' || !WORD_CHARACTER.test(this.source[position + marker.length] ?? '')) {
        return true;
      }

      position = this.source.indexOf(marker, position + 1);
    }

    return false;
  }
}

const markdownInlines = (text: string, store: ImageStore | null): Inline[] =>
  new MarkdownInlineReader(text, store).read();

const markdownPlain = (text: string): string => tidy(runsText(cellRuns(markdownInlines(text, null))));

const tableCells = (line: string): string[] => {
  let row = line.trim();

  if (row.startsWith('|')) {
    row = row.slice(1);
  }

  if (row.endsWith('|') && !row.endsWith('\\|')) {
    row = row.slice(0, -1);
  }

  return row.split(/(?<!\\)\|/).map((cell) => cell.trim());
};

const isTableSeparator = (line: string): boolean =>
  line.includes('|') && tableCells(line).every((cell) => /^:?-+:?$/.test(cell));

const isTableStart = (lines: string[], index: number): boolean =>
  lines[index].includes('|') && index + 1 < lines.length && isTableSeparator(lines[index + 1]);

// A pipe table: the header row, the separator and every following row that has a "|".
const readTable = (lines: string[], index: number): { item: Item; next: number } => {
  const rowLines = [lines[index]];
  let next = index + 2;

  while (next < lines.length && lines[next].includes('|')) {
    rowLines.push(lines[next]);
    next += 1;
  }

  const rows = rowLines.map((line) => tableCells(line).map((cell) => cellRuns(markdownInlines(cell, null))));

  return { item: { kind: 'paragraph', ...tableParagraph(rows) }, next };
};

const markdownLine = (line: string, push: (item: Item | null, startsParagraph: boolean) => void): void => {
  const heading = MARKDOWN_HEADING.exec(line);

  if (MARKDOWN_RULE.test(line)) {
    push({ kind: 'paragraph', text: BREAK_TEXT }, true);
  } else if (heading) {
    push({ kind: 'heading', level: heading[1].length, text: markdownPlain(headingText(heading[2])) }, true);
  } else if (line.trim() === '') {
    push(null, true);
  } else {
    push({ kind: 'paragraph', text: line.replace(/^\s*>\s?/, '').trim() }, PARAGRAPH_START.test(line));
  }
};

const parseMarkdown = (text: string, store: ImageStore): Parsed => {
  const lines = text.split(/\r?\n/);
  const front = frontMatter(lines);
  const items: Item[] = [];
  let paragraph: string[] = [];

  const flush = (): void => {
    if (paragraph.length > 0) {
      const inlines = markdownInlines(paragraph.join(' '), store);
      items.push(...splitAtImages(inlines).map((item): Item => ({ kind: 'paragraph', ...item })));
      paragraph = [];
    }
  };

  // Text lines join the open paragraph; anything else closes it and stands alone.
  const push = (item: Item | null, startsParagraph: boolean): void => {
    if (startsParagraph) {
      flush();
    }

    if (item?.kind === 'paragraph' && item.text !== BREAK_TEXT) {
      paragraph.push(item.text);
    } else if (item) {
      items.push(item);
    }
  };

  let index = front.skip;

  while (index < lines.length) {
    if (isTableStart(lines, index)) {
      flush();
      const table = readTable(lines, index);
      items.push(table.item);
      index = table.next;
    } else {
      markdownLine(lines[index], push);
      index += 1;
    }
  }

  flush();

  return { items, title: front.title, author: front.author };
};

const htmlInlineText = (html: string): string =>
  tidy(decodeEntities(stripTags(html.replace(/\s+/g, ' ').replace(/<br\s*\/?>/gi, '\n'))));

const HTML_BOLD = new Set(['b', 'strong']);
const HTML_ITALIC = new Set(['i', 'em']);

type HtmlState = { bold: number; italic: number; inlines: Inline[]; store: ImageStore | null };

const htmlImage = (tag: string, state: HtmlState): void => {
  const alt = decodeEntities(attribute(tag, 'alt'));
  const src = state.store ? storeDataUri(state.store, attribute(tag, 'src').trim()) : null;

  if (src) {
    state.inlines.push({ kind: 'image', src, alt });
  } else {
    state.inlines.push(textRun(alt, { bold: state.bold > 0, italic: state.italic > 0 }));
  }
};

const htmlTag = (tag: string, state: HtmlState): void => {
  const name = /^<\/?([a-z0-9]+)/i.exec(tag)?.[1].toLowerCase() ?? '';
  const step = tag.startsWith('</') ? -1 : 1;

  if (HTML_BOLD.has(name)) {
    state.bold = Math.max(0, state.bold + step);
  } else if (HTML_ITALIC.has(name)) {
    state.italic = Math.max(0, state.italic + step);
  } else if (name === 'br') {
    state.inlines.push(textRun('\n', PLAIN));
  } else if (name === 'img') {
    htmlImage(tag, state);
  }
};

// <b>/<strong> and <i>/<em> become runs, <br> a line break, and <img> with a data URI an image.
// Remote images keep only their alt text: the converter never downloads anything.
const htmlInlines = (html: string, store: ImageStore | null): Inline[] => {
  const state: HtmlState = { bold: 0, italic: 0, inlines: [], store };

  for (const token of markupTokens(html.replace(/\s+/g, ' '))) {
    if (token.startsWith('<')) {
      htmlTag(token, state);
    } else {
      state.inlines.push(textRun(decodeEntities(token), { bold: state.bold > 0, italic: state.italic > 0 }));
    }
  }

  return state.inlines;
};

const htmlTable = (tableHtml: string): Item => {
  const rows = [...tableHtml.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].map((row) =>
    [...row[1].matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((cell) => cellRuns(htmlInlines(cell[1], null))),
  );

  return { kind: 'paragraph', ...tableParagraph(rows) };
};

const htmlParagraphs = (html: string, store: ImageStore): Item[] =>
  splitAtImages(htmlInlines(html, store)).map((item): Item => ({ kind: 'paragraph', ...item }));

const htmlBlock = (block: RegExpExecArray, store: ImageStore): Item[] => {
  const name = block[1]?.toLowerCase();

  if (!name) {
    return block[0][1] === 'h' || block[0][1] === 'H'
      ? [{ kind: 'paragraph', text: BREAK_TEXT }]
      : htmlParagraphs(block[0], store);
  }

  if (name === 'p') {
    return htmlParagraphs(block[2], store);
  }

  if (name === 'table') {
    return [htmlTable(block[2])];
  }

  return [{ kind: 'heading', level: Number(name[1]), text: htmlInlineText(block[2]).replace(/\n+/g, ' ') }];
};

// Comments and hidden elements are removed until none is left, so pieces that join up after one pass
// ("<!<!-- -->--", "<scr<script></script>ipt>") are removed too.
export const withoutHiddenParts = (html: string): string => {
  let previous: string;
  let body = html;

  do {
    previous = body;
    body = body.replace(/<!--[\s\S]*?-->/g, '').replace(/<(script|style|head|template|noscript)\b[\s\S]*?<\/\1>/gi, '');
  } while (body !== previous);

  return body;
};

const parseHtml = (text: string, store: ImageStore): Parsed => {
  const title = htmlInlineText(/<title(?:\s[^>]*)?>([\s\S]*?)<\/title>/i.exec(text)?.[1] ?? '');
  const author = decodeEntities(/<meta\s+name=["']author["']\s+content=["']([^"']*)["']/i.exec(text)?.[1] ?? '').trim();
  const body = withoutHiddenParts(text);
  const items = [...body.matchAll(/<(h[1-6]|p|table)(?:\s[^>]*)?>([\s\S]*?)<\/\1>|<(?:hr|img)\b[^>]*>/gi)].flatMap(
    (block) => htmlBlock(block, store),
  );

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
type ChapterDraft = { title: string; lines: string[]; blocks: RichBlock[]; rich: boolean };

const plainBlocks = (text: string): RichBlock[] =>
  blocksOf(text).map((block) => (block.kind === 'break' ? block : { kind: 'paragraph', runs: [{ text: block.text }] }));

// Smaller headings stay in the chapter as plain paragraphs.
const addToChapter = (chapter: ChapterDraft, item: Item): void => {
  const block = item.kind === 'paragraph' ? item.block : undefined;

  if (item.text) {
    chapter.lines.push(item.text);
  }

  chapter.blocks.push(...(block ? [block] : plainBlocks(item.text)));
  chapter.rich ||= block !== undefined;
};

const hasContent = (item: Item): boolean =>
  item.text.length > 0 || (item.kind === 'paragraph' && item.block !== undefined);

// A chapter carries its rich content only when something in it is formatted, so plain books stay
// exactly as before.
const finishChapter = (chapter: ChapterDraft): Chapter => {
  const finished: Chapter = { title: chapter.title, text: chapter.lines.join('\n') };

  if (chapter.rich) {
    finished.content = chapter.blocks;
  }

  return finished;
};

const assemble = (parsed: Parsed, fallbackTitle: string): ConvertedBook => {
  const items = parsed.items.filter(hasContent);

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
  const chapters: ChapterDraft[] = [];
  const newChapter = (chapterTitle: string): ChapterDraft => ({
    title: chapterTitle,
    lines: [],
    blocks: [],
    rich: false,
  });

  for (const item of titleHeading ? items.slice(1) : items) {
    if (item.kind === 'heading' && item.level <= chapterLevel) {
      chapters.push(newChapter(item.text));
    } else {
      if (chapters.length === 0) {
        chapters.push(newChapter(titleHeading || title));
      }

      addToChapter(chapters[chapters.length - 1], item);
    }
  }

  return {
    title,
    author: parsed.author,
    chapters: chapters.map(finishChapter),
  };
};

const parseZip = async (format: 'docx' | 'odt', bytes: Uint8Array, store: ImageStore): Promise<Parsed> => {
  if (!isZip(bytes)) {
    throw new ConvertError('broken');
  }

  let entries: ZipEntry[];

  try {
    entries = await readZipAsync(bytes);
  } catch {
    throw new ConvertError('broken');
  }

  return format === 'docx' ? parseDocx(entries, store) : parseOdt(entries, store);
};

const parseText = (format: 'md' | 'txt' | 'html', text: string, store: ImageStore): Parsed => {
  if (format === 'md') {
    return parseMarkdown(text, store);
  }

  return format === 'html' ? parseHtml(text, store) : parseTxt(text);
};

export const convertFile = async (fileName: string, bytes: Uint8Array): Promise<ConvertedBook> => {
  const format = formatOf(fileName);

  if (!format) {
    throw new ConvertError('unsupported');
  }

  if (bytes.length > MAX_FILE_BYTES) {
    throw new ConvertError('too-big');
  }

  const store = new ImageStore();
  const parsed =
    format === 'docx' || format === 'odt'
      ? await parseZip(format, bytes, store)
      : parseText(format, decodeText(bytes), store);
  const book = assemble(parsed, baseName(fileName));

  if (store.images.length > 0) {
    book.images = store.images;
  }

  if (store.skipped > 0) {
    book.skippedImages = store.skipped;
  }

  return book;
};
