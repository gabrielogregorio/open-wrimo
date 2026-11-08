import { EPUB_STYLE, EPUB_TYPE, KINDLE_STYLE, buildEpub, chapterXhtml, packageXml, randomUuid } from './epub';
import { readZip, textOf } from './zip';

const input = {
  id: '1234',
  title: 'Noite & Dia',
  author: 'Ana',
  contentsLabel: 'Sumário',
  chapters: [
    { title: 'Um', text: 'Começo.\n***\nMeio.' },
    { title: 'Dois <2>', text: 'Fim.' },
  ],
};

describe('buildEpub', () => {
  it('puts the mimetype first and every part after it', () => {
    const bytes = buildEpub(input, new Date('2026-11-08T10:00:00Z'));
    const files = readZip(bytes);
    const byName = Object.fromEntries(files.map((file) => [file.name, textOf(file.data)]));

    expect(textOf(bytes.subarray(30, 38))).toBe('mimetype');
    expect(textOf(bytes.subarray(38, 58))).toBe(EPUB_TYPE);
    expect(files.map((file) => file.name)).toEqual([
      'mimetype',
      'META-INF/container.xml',
      'OEBPS/content.opf',
      'OEBPS/nav.xhtml',
      'OEBPS/title.xhtml',
      'OEBPS/style.css',
      'OEBPS/chapter-001.xhtml',
      'OEBPS/chapter-002.xhtml',
    ]);
    expect(byName['META-INF/container.xml']).toContain('OEBPS/content.opf');
    expect(byName['OEBPS/nav.xhtml']).toContain('<li><a href="chapter-002.xhtml">Dois &lt;2&gt;</a></li>');
    expect(byName['OEBPS/nav.xhtml']).toContain('epub:type="toc"');
    expect(byName['OEBPS/title.xhtml']).toContain('Noite &amp; Dia');
    expect(buildEpub(input).length).toBeGreaterThan(0);
  });

  it('describes the book in the package document', () => {
    const xml = packageXml(input, new Date('2026-11-08T10:00:00.500Z'));

    expect(xml).toContain('<dc:identifier id="book-id">urn:uuid:1234</dc:identifier>');
    expect(xml).toContain('<dc:language>pt-BR</dc:language>');
    expect(xml).toContain('<meta property="dcterms:modified">2026-11-08T10:00:00Z</meta>');
    expect(xml).toContain('properties="nav"');
    expect(xml).toContain('<itemref idref="c2"/>');
  });

  it('writes chapters as XHTML', () => {
    expect(chapterXhtml(input.chapters[0])).toContain(
      '<h1>Um</h1><p>Começo.</p><p class="break">* * *</p><p>Meio.</p>',
    );
  });
});

describe('randomUuid', () => {
  it('makes version 4 UUIDs', () => {
    expect(randomUuid()).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(randomUuid()).not.toBe(randomUuid());
  });
});

describe('buildEpub for Kindle', () => {
  it('adds an NCX table of contents, landmarks, chapter ids and a simpler stylesheet', () => {
    const files = readZip(buildEpub({ ...input, kindle: true }, new Date('2026-11-08T10:00:00Z')));
    const byName = Object.fromEntries(files.map((file) => [file.name, textOf(file.data)]));

    expect(byName['OEBPS/style.css']).toBe(KINDLE_STYLE);
    expect(KINDLE_STYLE).not.toContain('font-family');
    expect(byName['OEBPS/content.opf']).toContain('<spine toc="ncx">');
    expect(byName['OEBPS/content.opf']).toContain('href="toc.ncx" media-type="application/x-dtbncx+xml"');
    expect(byName['OEBPS/toc.ncx']).toContain('<meta name="dtb:uid" content="urn:uuid:1234"/>');
    expect(byName['OEBPS/toc.ncx']).toContain(
      '<navPoint id="np2" playOrder="2"><navLabel><text>Dois &lt;2&gt;</text></navLabel><content src="chapter-002.xhtml"/></navPoint>',
    );
    expect(byName['OEBPS/nav.xhtml']).toContain('epub:type="landmarks"');
    expect(byName['OEBPS/nav.xhtml']).toContain('<a epub:type="bodymatter" href="chapter-001.xhtml">Um</a>');
    expect(byName['OEBPS/chapter-002.xhtml']).toContain('<section id="chapter-2">');
  });

  it('keeps the default layout without the option and handles a book with no chapters', () => {
    const plain = readZip(buildEpub(input));

    expect(textOf(plain.find((file) => file.name === 'OEBPS/style.css')!.data)).toBe(EPUB_STYLE);
    expect(plain.some((file) => file.name === 'OEBPS/toc.ncx')).toBe(false);

    const empty = readZip(buildEpub({ ...input, chapters: [], kindle: true }));
    const nav = textOf(empty.find((file) => file.name === 'OEBPS/nav.xhtml')!.data);

    expect(nav).toContain('epub:type="landmarks"');
    expect(nav).not.toContain('bodymatter');
  });
});
