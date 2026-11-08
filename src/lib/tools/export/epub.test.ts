import { EPUB_TYPE, buildEpub, chapterXhtml, packageXml, randomUuid } from './epub';
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
