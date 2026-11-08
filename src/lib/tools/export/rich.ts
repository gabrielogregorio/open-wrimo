// Helpers shared by the converter readers to keep bold, italic, images and tables: runs of formatted
// text, a store for the images that go inside the ePub, data URIs and nested elements.
import type { RichBlock, Run } from './text';

export type BookImage = { path: string; mediaType: string; bytes: Uint8Array };

// A piece of inline content: formatted text or an image already placed in the store.
export type Inline = ({ kind: 'text' } & Run) | { kind: 'image'; src: string; alt: string };

export type Format = { bold: boolean; italic: boolean };

export const PLAIN: Format = { bold: false, italic: false };

export const MAX_IMAGE_BYTES = 50 * 1024 * 1024;

const MEDIA_TYPES: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  svg: 'image/svg+xml',
  webp: 'image/webp',
};

const KNOWN_TYPES = new Set(Object.values(MEDIA_TYPES));

const EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/svg+xml': 'svg',
  'image/webp': 'webp',
};

export const mediaTypeOf = (fileName: string): string | null => {
  const extension = fileName.slice(fileName.lastIndexOf('.') + 1).toLowerCase();

  return MEDIA_TYPES[extension] ?? null;
};

// Keeps the images of a book while they fit in the size limit. Formats e-readers do not show (EMF,
// TIFF...) and images past the limit are counted as skipped.
export class ImageStore {
  readonly images: BookImage[] = [];
  skipped = 0;
  private bytes = 0;
  private readonly byKey = new Map<string, string>();

  constructor(private readonly limit = MAX_IMAGE_BYTES) {}

  add(bytes: Uint8Array, mediaType: string | null, key = ''): string | null {
    const known = key ? this.byKey.get(key) : undefined;

    if (known) {
      return known;
    }

    if (!mediaType || !KNOWN_TYPES.has(mediaType) || this.bytes + bytes.length > this.limit) {
      this.skipped += 1;

      return null;
    }

    const path = `images/image-${String(this.images.length + 1).padStart(3, '0')}.${EXTENSIONS[mediaType]}`;
    this.images.push({ path, mediaType, bytes });
    this.bytes += bytes.length;

    if (key) {
      this.byKey.set(key, path);
    }

    return path;
  }
}

const base64Bytes = (data: string): Uint8Array | null => {
  try {
    return Uint8Array.from(atob(data.replace(/\s+/g, '')), (character) => character.charCodeAt(0));
  } catch {
    return null;
  }
};

const percentBytes = (data: string): Uint8Array | null => {
  try {
    return new TextEncoder().encode(decodeURIComponent(data));
  } catch {
    return null;
  }
};

// "data:image/png;base64,iVBOR..." or "data:image/svg+xml,%3Csvg...". Anything else is not read:
// the converter never downloads.
export const dataUriImage = (uri: string): { mediaType: string; bytes: Uint8Array } | null => {
  const comma = uri.indexOf(',');

  if (!uri.toLowerCase().startsWith('data:') || comma < 0) {
    return null;
  }

  const header = uri.slice(5, comma).toLowerCase().split(';');
  const payload = uri.slice(comma + 1);
  const bytes = header.includes('base64') ? base64Bytes(payload) : percentBytes(payload);

  return bytes ? { mediaType: header[0], bytes } : null;
};

// Places a data URI image in the store. Remote images are left out (null) and not counted.
export const storeDataUri = (store: ImageStore, uri: string): string | null => {
  const image = dataUriImage(uri);

  if (!image) {
    if (uri.toLowerCase().startsWith('data:')) {
      store.skipped += 1;
    }

    return null;
  }

  return store.add(image.bytes, image.mediaType);
};

const sameFormat = (first: Run, second: Run): boolean =>
  Boolean(first.bold) === Boolean(second.bold) && Boolean(first.italic) === Boolean(second.italic);

const makeRun = (text: string, format: { bold?: boolean; italic?: boolean }): Run => {
  const run: Run = { text };

  if (format.bold) {
    run.bold = true;
  }

  if (format.italic) {
    run.italic = true;
  }

  return run;
};

// Collapses spaces, trims the ends of the paragraph and of every line, drops empty runs and joins
// neighbors with the same format, so the runs read like the plain text.
export const normalizeRuns = (runs: Run[]): Run[] => {
  const result: Run[] = [];
  let previous = '\n';

  for (const run of runs) {
    let text = run.text.replace(/[ \t ]+/g, ' ').replace(/ ?\n ?/g, '\n');

    if ((previous.endsWith(' ') || previous.endsWith('\n')) && text.startsWith(' ')) {
      text = text.slice(1);
    }

    if (previous.endsWith(' ') && text.startsWith('\n')) {
      const last = result[result.length - 1];
      last.text = last.text.slice(0, -1);
    }

    if (text) {
      const last = result[result.length - 1];

      if (last && sameFormat(last, run)) {
        last.text += text;
      } else {
        result.push(makeRun(text, run));
      }

      previous = text;
    }
  }

  const last = result[result.length - 1];

  if (last) {
    last.text = last.text.trimEnd();
  }

  return result.filter((run) => run.text.length > 0);
};

export const runsText = (runs: Run[]): string => runs.map((run) => run.text).join('');

export const hasFormatting = (runs: Run[]): boolean => runs.some((run) => run.bold || run.italic);

export const textRun = (text: string, format: Format): Inline => ({ kind: 'text', ...makeRun(text, format) });

export type InlineParagraph = { text: string; block?: RichBlock };

// Splits inline content at its images: text becomes paragraphs (with runs only when some of it is
// bold or italic) and every image becomes a block of its own.
export const splitAtImages = (inlines: Inline[]): InlineParagraph[] => {
  const paragraphs: InlineParagraph[] = [];
  let runs: Run[] = [];

  const flush = (): void => {
    const normalized = normalizeRuns(runs);
    const text = runsText(normalized);

    if (text) {
      paragraphs.push(hasFormatting(normalized) ? { text, block: { kind: 'paragraph', runs: normalized } } : { text });
    }

    runs = [];
  };

  for (const inline of inlines) {
    if (inline.kind === 'image') {
      flush();
      paragraphs.push({ text: '', block: { kind: 'image', src: inline.src, alt: inline.alt } });
    } else {
      runs.push(inline);
    }
  }

  flush();

  return paragraphs;
};

export const cellRuns = (inlines: Inline[]): Run[] =>
  normalizeRuns(inlines.flatMap((inline) => (inline.kind === 'text' ? [inline] : [])));

export const tableParagraph = (rows: Run[][][]): InlineParagraph => ({
  text: rows.map((row) => row.map(runsText).join(' | ')).join('\n'),
  block: { kind: 'table', rows },
});

// Cuts xml into the parts outside and the elements named tag, counting nested elements of the same
// name (a table inside a table cell stays inside its outer table).
export const splitElements = (xml: string, tag: string): { inside: boolean; xml: string }[] => {
  const parts: { inside: boolean; xml: string }[] = [];
  const pattern = new RegExp(`<(/?)${tag}(?=[\\s>/])[^>]*?(/?)>`, 'g');
  let depth = 0;
  let start = 0;

  for (const match of xml.matchAll(pattern)) {
    if (match[1] && depth > 0) {
      depth -= 1;

      if (depth === 0) {
        parts.push({ inside: true, xml: xml.slice(start, match.index + match[0].length) });
        start = match.index + match[0].length;
      }
    } else if (!match[1] && !match[2]) {
      if (depth === 0) {
        parts.push({ inside: false, xml: xml.slice(start, match.index) });
        start = match.index;
      }

      depth += 1;
    }
  }

  parts.push({ inside: false, xml: xml.slice(start) });

  return parts.filter((part) => part.xml.length > 0);
};

// Cuts markup into tags ("<...>") and the text between them.
export const markupTokens = (xml: string): string[] => {
  const tokens: string[] = [];
  let position = 0;

  while (position < xml.length) {
    const isTag = xml[position] === '<';
    const stop = isTag ? xml.indexOf('>', position) + 1 : xml.indexOf('<', position);
    const end = stop > 0 ? stop : xml.length;
    tokens.push(xml.slice(position, end));
    position = end;
  }

  return tokens;
};

export const attribute = (tag: string, name: string): string =>
  new RegExp(`\\s${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`, 'i')
    .exec(tag)
    ?.slice(1)
    .find((value) => value !== undefined) ?? '';
