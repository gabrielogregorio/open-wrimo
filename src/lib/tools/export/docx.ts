// A minimal Word document (OOXML) in standard manuscript format: Times New Roman 12pt, double spacing,
// 2.5 cm margins, first-line indent, a header with the short title and the page number, and every
// chapter on a new page. A title page comes first, without the header.
import { blocksOf, escapeXml, type Chapter } from './text';
import { createZip } from './zip';

export type ManuscriptInput = {
  title: string;
  author: string;
  shortTitle: string;
  chapters: Chapter[];
  wordCount: number;
};

const XML_HEADER = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
const WORDS_NAMESPACE = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const RELATIONS_NAMESPACE = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const PACKAGE_RELATIONS = 'http://schemas.openxmlformats.org/package/2006/relationships';
// 2.5 cm in twentieths of a point.
const MARGIN = 1417;

const run = (text: string): string => `<w:r><w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r>`;

const styleOf = (style: string): string => `<w:pPr><w:pStyle w:val="${style}"/></w:pPr>`;

const paragraph = (text: string, style?: string): string => `<w:p>${style ? styleOf(style) : ''}${run(text)}</w:p>`;

const emptyLines = (count: number): string => '<w:p><w:pPr><w:pStyle w:val="Plain"/></w:pPr></w:p>'.repeat(count);

const chapterXml = (chapter: Chapter): string =>
  [
    paragraph(chapter.title, 'Heading1'),
    ...blocksOf(chapter.text).map((block) =>
      block.kind === 'break' ? paragraph('#', 'SceneBreak') : paragraph(block.text),
    ),
  ].join('');

export const documentXml = (input: ManuscriptInput, wordsLabel: string): string => {
  const titlePage = [
    paragraph(input.author, 'Plain'),
    paragraph(wordsLabel, 'Plain'),
    emptyLines(8),
    paragraph(input.title, 'Title'),
    paragraph(input.author, 'Byline'),
  ].join('');

  return (
    `${XML_HEADER}<w:document xmlns:w="${WORDS_NAMESPACE}" xmlns:r="${RELATIONS_NAMESPACE}"><w:body>` +
    titlePage +
    input.chapters.map(chapterXml).join('') +
    `<w:sectPr><w:headerReference w:type="default" r:id="rId2"/>` +
    `<w:pgSz w:w="11906" w:h="16838"/>` +
    `<w:pgMar w:top="${MARGIN}" w:right="${MARGIN}" w:bottom="${MARGIN}" w:left="${MARGIN}" w:header="709" w:footer="709" w:gutter="0"/>` +
    `<w:titlePg/></w:sectPr></w:body></w:document>`
  );
};

const headerXml = (shortTitle: string): string =>
  `${XML_HEADER}<w:hdr xmlns:w="${WORDS_NAMESPACE}"><w:p><w:pPr><w:pStyle w:val="Plain"/><w:jc w:val="right"/></w:pPr>` +
  run(shortTitle + ' / ') +
  `<w:fldSimple w:instr=" PAGE "><w:r><w:t>1</w:t></w:r></w:fldSimple></w:p></w:hdr>`;

const STYLES =
  `${XML_HEADER}<w:styles xmlns:w="${WORDS_NAMESPACE}">` +
  '<w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:eastAsia="Times New Roman" w:cs="Times New Roman"/>' +
  '<w:sz w:val="24"/><w:szCs w:val="24"/><w:lang w:val="pt-BR"/></w:rPr></w:rPrDefault>' +
  '<w:pPrDefault><w:pPr><w:spacing w:before="0" w:after="0" w:line="480" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>' +
  '<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:pPr><w:ind w:firstLine="709"/></w:pPr></w:style>' +
  '<w:style w:type="paragraph" w:styleId="Plain"><w:name w:val="Plain"/><w:basedOn w:val="Normal"/><w:pPr><w:ind w:firstLine="0"/></w:pPr></w:style>' +
  '<w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:basedOn w:val="Plain"/><w:pPr><w:jc w:val="center"/></w:pPr><w:rPr><w:b/></w:rPr></w:style>' +
  '<w:style w:type="paragraph" w:styleId="Byline"><w:name w:val="Byline"/><w:basedOn w:val="Plain"/><w:pPr><w:jc w:val="center"/></w:pPr></w:style>' +
  '<w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Plain"/><w:next w:val="Normal"/>' +
  '<w:pPr><w:pageBreakBefore/><w:spacing w:before="2880" w:after="480"/><w:jc w:val="center"/><w:outlineLvl w:val="0"/></w:pPr></w:style>' +
  '<w:style w:type="paragraph" w:styleId="SceneBreak"><w:name w:val="Scene break"/><w:basedOn w:val="Plain"/><w:pPr><w:jc w:val="center"/></w:pPr></w:style>' +
  '</w:styles>';

const coreXml = (input: ManuscriptInput, modified: Date): string =>
  `${XML_HEADER}<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" ` +
  'xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" ' +
  'xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">' +
  `<dc:title>${escapeXml(input.title)}</dc:title><dc:creator>${escapeXml(input.author)}</dc:creator><dc:language>pt-BR</dc:language>` +
  `<dcterms:modified xsi:type="dcterms:W3CDTF">${modified.toISOString().slice(0, 19)}Z</dcterms:modified></cp:coreProperties>`;

const CONTENT_TYPES =
  `${XML_HEADER}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
  '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
  '<Default Extension="xml" ContentType="application/xml"/>' +
  '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>' +
  '<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>' +
  '<Override PartName="/word/header1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"/>' +
  '<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>' +
  '</Types>';

const ROOT_RELATIONS =
  `${XML_HEADER}<Relationships xmlns="${PACKAGE_RELATIONS}">` +
  '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>' +
  '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>' +
  '</Relationships>';

const DOCUMENT_RELATIONS =
  `${XML_HEADER}<Relationships xmlns="${PACKAGE_RELATIONS}">` +
  '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>' +
  '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/header" Target="header1.xml"/>' +
  '</Relationships>';

export const DOCX_TYPE = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

export const buildDocx = (input: ManuscriptInput, wordsLabel: string, modified: Date = new Date()): Uint8Array =>
  createZip(
    [
      { name: '[Content_Types].xml', data: CONTENT_TYPES },
      { name: '_rels/.rels', data: ROOT_RELATIONS },
      { name: 'docProps/core.xml', data: coreXml(input, modified) },
      { name: 'word/document.xml', data: documentXml(input, wordsLabel) },
      { name: 'word/styles.xml', data: STYLES },
      { name: 'word/header1.xml', data: headerXml(input.shortTitle) },
      { name: 'word/_rels/document.xml.rels', data: DOCUMENT_RELATIONS },
    ],
    modified,
  );
