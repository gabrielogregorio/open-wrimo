// An EPUB 3 book: the mimetype stored first, the container, the package document, a navigation
// document, one XHTML file per chapter and a small stylesheet.
import type { BookImage } from './rich';
import { blocksOf, escapeXml, type Chapter, type RichBlock, type Run } from './text';
import { createZip } from './zip';

// kindle: a simpler stylesheet that leaves fonts, sizes and alignment to the reader, ids on every
// chapter, hidden landmarks and an EPUB 2 table of contents (toc.ncx) for older readers and Send to Kindle.
export type EpubInput = {
  id: string;
  title: string;
  author: string;
  chapters: Chapter[];
  contentsLabel: string;
  kindle?: boolean;
  images?: BookImage[];
};

export const EPUB_TYPE = 'application/epub+zip';

const XML_HEADER = '<?xml version="1.0" encoding="UTF-8"?>';

const CONTAINER =
  `${XML_HEADER}<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">` +
  '<rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>';

export const EPUB_STYLE = [
  'body { font-family: serif; line-height: 1.5; margin: 0 1em; }',
  'h1 { text-align: center; margin: 3em 0 1.5em; font-size: 1.6em; }',
  'p { margin: 0; text-indent: 1.5em; text-align: justify; }',
  'h1 + p, p.break + p { text-indent: 0; }',
  'p.break { text-align: center; text-indent: 0; margin: 1em 0; }',
  '.title-page { text-align: center; margin-top: 30%; }',
  '.title-page p { text-indent: 0; text-align: center; }',
  'p.image { text-indent: 0; text-align: center; margin: 1em 0; }',
  'img { max-width: 100%; height: auto; }',
  'table { border-collapse: collapse; margin: 1em auto; }',
  'td { border: 1px solid #888; padding: 0.2em 0.5em; vertical-align: top; text-align: left; }',
].join('\n');

export const KINDLE_STYLE = [
  'h1 { text-align: center; margin: 2em 0 1em; page-break-before: always; }',
  'p { margin: 0; text-indent: 1.5em; }',
  'h1 + p, p.break + p { text-indent: 0; }',
  'p.break { text-align: center; text-indent: 0; margin: 1em 0; }',
  '.title-page { text-align: center; }',
  '.title-page p { text-indent: 0; text-align: center; }',
  'p.image { text-indent: 0; text-align: center; margin: 1em 0; }',
  'img { max-width: 100%; }',
  'table { border-collapse: collapse; margin: 1em 0; }',
  'td { border: 1px solid; padding: 0.2em; vertical-align: top; }',
].join('\n');

const page = (title: string, body: string, extraNamespace = ''): string =>
  `${XML_HEADER}<!DOCTYPE html><html xmlns="http://www.w3.org/1999/xhtml"${extraNamespace} xml:lang="pt-BR" lang="pt-BR">` +
  `<head><meta charset="utf-8"/><title>${escapeXml(title)}</title><link rel="stylesheet" type="text/css" href="style.css"/></head>` +
  `<body>${body}</body></html>`;

const chapterFile = (index: number): string => `chapter-${String(index + 1).padStart(3, '0')}.xhtml`;

const idAttribute = (id: string): string => (id ? ` id="${id}"` : '');

const BREAK_XHTML = '<p class="break">* * *</p>';

const runXhtml = (run: Run): string => {
  let xhtml = escapeXml(run.text).replace(/\n/g, '<br/>');

  if (run.italic) {
    xhtml = `<em>${xhtml}</em>`;
  }

  return run.bold ? `<strong>${xhtml}</strong>` : xhtml;
};

const runsXhtml = (runs: Run[]): string => runs.map(runXhtml).join('');

const richBlockXhtml = (block: RichBlock): string => {
  if (block.kind === 'break') {
    return BREAK_XHTML;
  }

  if (block.kind === 'image') {
    return `<p class="image"><img src="${escapeXml(block.src)}" alt="${escapeXml(block.alt)}"/></p>`;
  }

  if (block.kind === 'table') {
    const cellXhtml = (cell: Run[]): string => `<td>${runsXhtml(cell)}</td>`;
    const rows = block.rows.map((row) => `<tr>${row.map(cellXhtml).join('')}</tr>`);

    return `<table><tbody>${rows.join('')}</tbody></table>`;
  }

  return `<p>${runsXhtml(block.runs)}</p>`;
};

// Formatted content when the converter kept it, otherwise the plain text, one paragraph per line.
const chapterBody = (chapter: Chapter): string =>
  chapter.content
    ? chapter.content.map(richBlockXhtml).join('')
    : blocksOf(chapter.text)
        .map((block) => (block.kind === 'break' ? BREAK_XHTML : `<p>${escapeXml(block.text)}</p>`))
        .join('');

export const chapterXhtml = (chapter: Chapter, sectionId = ''): string =>
  page(
    chapter.title,
    `<section${idAttribute(sectionId)}><h1>${escapeXml(chapter.title)}</h1>${chapterBody(chapter)}</section>`,
  );

const landmarks = (input: EpubInput): string =>
  '<nav epub:type="landmarks" id="landmarks" hidden="hidden"><ol>' +
  `<li><a epub:type="toc" href="nav.xhtml#toc">${escapeXml(input.contentsLabel)}</a></li>` +
  (input.chapters.length > 0
    ? `<li><a epub:type="bodymatter" href="${chapterFile(0)}">${escapeXml(input.chapters[0].title)}</a></li>`
    : '') +
  '</ol></nav>';

export const ncxXml = (input: EpubInput): string =>
  `${XML_HEADER}<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">` +
  `<head><meta name="dtb:uid" content="urn:uuid:${escapeXml(input.id)}"/></head>` +
  `<docTitle><text>${escapeXml(input.title)}</text></docTitle><navMap>` +
  input.chapters
    .map(
      (chapter, index) =>
        `<navPoint id="np${index + 1}" playOrder="${index + 1}"><navLabel><text>${escapeXml(chapter.title)}</text></navLabel>` +
        `<content src="${chapterFile(index)}"/></navPoint>`,
    )
    .join('') +
  '</navMap></ncx>';

const navXhtml = (input: EpubInput): string =>
  page(
    input.contentsLabel,
    `<nav epub:type="toc" id="toc"><h1>${escapeXml(input.contentsLabel)}</h1><ol>` +
      input.chapters
        .map((chapter, index) => `<li><a href="${chapterFile(index)}">${escapeXml(chapter.title)}</a></li>`)
        .join('') +
      '</ol></nav>' +
      (input.kindle ? landmarks(input) : ''),
    ' xmlns:epub="http://www.idpf.org/2007/ops"',
  );

const titleXhtml = (input: EpubInput): string =>
  page(
    input.title,
    `<section class="title-page"><h1>${escapeXml(input.title)}</h1><p>${escapeXml(input.author)}</p></section>`,
  );

export const packageXml = (input: EpubInput, modified: Date): string => {
  const items = input.chapters
    .map(
      (_chapter, index) => `<item id="c${index + 1}" href="${chapterFile(index)}" media-type="application/xhtml+xml"/>`,
    )
    .join('');
  const images = (input.images ?? [])
    .map(
      (image, index) =>
        `<item id="img${index + 1}" href="${escapeXml(image.path)}" media-type="${escapeXml(image.mediaType)}"/>`,
    )
    .join('');
  const spine = input.chapters.map((_chapter, index) => `<itemref idref="c${index + 1}"/>`).join('');

  return (
    `${XML_HEADER}<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="book-id" xml:lang="pt-BR">` +
    '<metadata xmlns:dc="http://purl.org/dc/elements/1.1/">' +
    `<dc:identifier id="book-id">urn:uuid:${escapeXml(input.id)}</dc:identifier>` +
    `<dc:title>${escapeXml(input.title)}</dc:title><dc:creator>${escapeXml(input.author)}</dc:creator>` +
    `<dc:language>pt-BR</dc:language><meta property="dcterms:modified">${modified.toISOString().slice(0, 19)}Z</meta>` +
    '</metadata><manifest>' +
    '<item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>' +
    '<item id="title" href="title.xhtml" media-type="application/xhtml+xml"/>' +
    '<item id="style" href="style.css" media-type="text/css"/>' +
    (input.kindle ? '<item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>' : '') +
    items +
    images +
    `</manifest><spine${input.kindle ? ' toc="ncx"' : ''}><itemref idref="title"/>${spine}</spine></package>`
  );
};

export const buildEpub = (input: EpubInput, modified: Date = new Date()): Uint8Array =>
  createZip(
    [
      { name: 'mimetype', data: EPUB_TYPE },
      { name: 'META-INF/container.xml', data: CONTAINER },
      { name: 'OEBPS/content.opf', data: packageXml(input, modified) },
      { name: 'OEBPS/nav.xhtml', data: navXhtml(input) },
      { name: 'OEBPS/title.xhtml', data: titleXhtml(input) },
      { name: 'OEBPS/style.css', data: input.kindle ? KINDLE_STYLE : EPUB_STYLE },
      ...(input.kindle ? [{ name: 'OEBPS/toc.ncx', data: ncxXml(input) }] : []),
      ...input.chapters.map((chapter, index) => ({
        name: `OEBPS/${chapterFile(index)}`,
        data: chapterXhtml(chapter, input.kindle ? `chapter-${index + 1}` : ''),
      })),
      ...(input.images ?? []).map((image) => ({ name: `OEBPS/${image.path}`, data: image.bytes })),
    ],
    modified,
  );

// A version 4 UUID from getRandomValues, which works on plain http too (randomUUID needs https).
export const randomUuid = (): string => {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');

  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
};
