import { DOCX_TYPE, buildDocx, documentXml } from './docx';
import { readZip, textOf } from './zip';

const input = {
  title: 'O Livro & Cia',
  author: 'Ana <Autora>',
  shortTitle: 'LIVRO',
  wordCount: 3,
  chapters: [
    { title: 'Capítulo 1', text: 'Era uma vez.\n***\nFim.' },
    { title: 'Capítulo 2', text: '' },
  ],
};

describe('buildDocx', () => {
  it('packs the parts of a Word document', () => {
    const files = readZip(buildDocx(input, 'about 3 words', new Date('2026-11-08T10:00:00Z')));
    const byName = Object.fromEntries(files.map((file) => [file.name, textOf(file.data)]));

    expect(files[0].name).toBe('[Content_Types].xml');
    expect(Object.keys(byName)).toEqual([
      '[Content_Types].xml',
      '_rels/.rels',
      'docProps/core.xml',
      'word/document.xml',
      'word/styles.xml',
      'word/header1.xml',
      'word/_rels/document.xml.rels',
    ]);
    expect(byName['docProps/core.xml']).toContain('<dc:title>O Livro &amp; Cia</dc:title>');
    expect(byName['docProps/core.xml']).toContain('2026-11-08T10:00:00Z');
    expect(byName['word/styles.xml']).toContain('Times New Roman');
    expect(byName['word/styles.xml']).toContain('w:line="480"');
    expect(byName['word/styles.xml']).toContain('<w:pageBreakBefore/>');
    expect(byName['word/header1.xml']).toContain('LIVRO / ');
    expect(byName['word/header1.xml']).toContain('PAGE');
    expect(DOCX_TYPE).toContain('wordprocessingml');
    expect(buildDocx(input, 'x').length).toBeGreaterThan(0);
  });

  it('writes the title page and chapters with scene breaks', () => {
    const xml = documentXml(input, 'about 3 words');

    expect(xml).toContain('Ana &lt;Autora&gt;');
    expect(xml).toContain('about 3 words');
    expect(xml).toContain('<w:pStyle w:val="Heading1"/></w:pPr><w:r><w:t xml:space="preserve">Capítulo 1');
    expect(xml).toContain('<w:pStyle w:val="SceneBreak"/>');
    expect(xml).toContain('<w:r><w:t xml:space="preserve">Era uma vez.</w:t></w:r>');
    expect(xml).toContain('w:top="1417"');
    expect(xml).toContain('<w:titlePg/>');
  });
});
