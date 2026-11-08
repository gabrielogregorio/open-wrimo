import {
  ConvertError,
  MAX_FILE_BYTES,
  baseName,
  convertFile,
  decodeEntities,
  decodeText,
  formatOf,
  type ConvertFailure,
} from './convert';
import { createDeflatedZip } from './test-zip';
import { createZip, utf8 } from './zip';

const W = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"';

const styleTag = (style: string): string => (style ? `<w:pStyle w:val="${style}"/>` : '');

const wordParagraph = (text: string, style = '', extra = ''): string =>
  `<w:p w:rsidR="00A1"><w:pPr>${styleTag(style)}${extra}<w:tabs><w:tab w:val="left" w:pos="720"/></w:tabs></w:pPr>` +
  `<w:r><w:t xml:space="preserve">${text}</w:t></w:r></w:p>`;

const docx = (body: string, extra: { name: string; data: string }[] = []): Promise<Uint8Array> =>
  createDeflatedZip([
    { name: '[Content_Types].xml', data: '<Types/>' },
    { name: 'word/document.xml', data: `<w:document ${W}><w:body>${body}<w:p/></w:body></w:document>` },
    ...extra,
  ]);

const failureOf = async (promise: Promise<unknown>): Promise<ConvertFailure | null> => {
  try {
    await promise;

    return null;
  } catch (error) {
    return error instanceof ConvertError ? error.reason : null;
  }
};

describe('formatOf and baseName', () => {
  it('knows the formats by extension', () => {
    expect(formatOf('Livro.DOCX')).toBe('docx');
    expect(formatOf('a.markdown')).toBe('md');
    expect(formatOf('a.htm')).toBe('html');
    expect(formatOf('a.pdf')).toBeNull();
    expect(formatOf('semextensao')).toBeNull();
    expect(baseName('Meu livro.docx')).toBe('Meu livro');
    expect(baseName('.txt')).toBe('.txt');
  });
});

describe('decodeText and decodeEntities', () => {
  it('falls back to windows-1252 when the bytes are not UTF-8', () => {
    expect(decodeText(utf8('ação'))).toBe('ação');
    expect(decodeText(new Uint8Array([0x61, 0xe7, 0xe3, 0x6f, 0x93]))).toBe('açãoo“'.replace('oo', 'o'));
  });

  it('decodes numeric, named and accented entities', () => {
    expect(decodeEntities('&amp;&#233;&#xE7;&#XE3;&aacute;&Ccedil;&otilde;&nbsp;&mdash;&bogus;&#0;')).toBe(
      '&éçãáÇõ —&bogus;&#0;',
    );
  });
});

describe('convertFile errors', () => {
  it('rejects unknown, too big, broken and empty files', async () => {
    expect(await failureOf(convertFile('a.pdf', utf8('x')))).toBe('unsupported');
    expect(await failureOf(convertFile('a.txt', new Uint8Array(MAX_FILE_BYTES + 1)))).toBe('too-big');
    expect(await failureOf(convertFile('a.docx', utf8('not a zip')))).toBe('broken');
    expect(await failureOf(convertFile('a.docx', utf8('PK but broken')))).toBe('broken');
    expect(await failureOf(convertFile('a.docx', createZip([{ name: 'x', data: 'y' }])))).toBe('broken');
    expect(await failureOf(convertFile('a.odt', createZip([{ name: 'x', data: 'y' }])))).toBe('broken');
    expect(await failureOf(convertFile('a.txt', utf8('  \n\n')))).toBe('empty');
    expect(await failureOf(convertFile('a.md', utf8('# Só um título')))).toBe('empty');
    expect(new ConvertError('empty').message).toBe('Conversion failed: empty');
  });
});

describe('docx', () => {
  it('reads headings from styles, localized ids and outline levels, with metadata', async () => {
    const styles =
      `<w:styles ${W}><w:style w:type="paragraph" w:styleId="Cabealho1"><w:name w:val="heading 1"/></w:style>` +
      '<w:style w:type="paragraph" w:styleId="Normal"><w:name w:val="Normal"/></w:style>' +
      '<w:style w:type="paragraph" w:styleId="Plain"></w:style></w:styles>';
    const core =
      '<cp:coreProperties><dc:title>O &amp; Livro</dc:title><dc:creator>Ana</dc:creator></cp:coreProperties>';
    const body = [
      wordParagraph('Capítulo 1', 'Cabealho1'),
      wordParagraph('Era uma vez', 'Normal'),
      `<w:p><w:r><w:t>Linha</w:t><w:br/><w:t>quebrada</w:t><w:tab/><w:t>e tab</w:t></w:r></w:p>`,
      wordParagraph('***'),
      wordParagraph('Dois', 'Ttulo1'),
      wordParagraph('Seção', 'Heading2'),
      wordParagraph('Texto'),
      wordParagraph('Três', '', '<w:outlineLvl w:val="0"/>'),
      wordParagraph('Fim'),
      wordParagraph('', 'Heading1'),
    ].join('');
    const book = await convertFile(
      'livro.docx',
      await docx(body, [
        { name: 'word/styles.xml', data: styles },
        { name: 'docProps/core.xml', data: core },
      ]),
    );

    expect(book.title).toBe('O & Livro');
    expect(book.author).toBe('Ana');
    expect(book.chapters).toEqual([
      { title: 'Capítulo 1', text: 'Era uma vez\nLinha\nquebrada e tab\n***' },
      { title: 'Dois', text: 'Seção\nTexto' },
      { title: 'Três', text: 'Fim' },
    ]);
  });

  it('uses a Title paragraph as the book title and the file name when nothing else is there', async () => {
    const titled = await convertFile(
      'x.docx',
      await docx(wordParagraph('Meu Livro', 'Title') + wordParagraph('Um', 'Heading1') + wordParagraph('Texto')),
    );

    expect(titled.title).toBe('Meu Livro');
    expect(titled.author).toBe('');
    expect(titled.chapters).toEqual([{ title: 'Um', text: 'Texto' }]);

    const plain = await convertFile('Sem títulos.docx', await docx(wordParagraph('Só texto')));

    expect(plain).toEqual({ title: 'Sem títulos', author: '', chapters: [{ title: 'Sem títulos', text: 'Só texto' }] });
  });

  it('keeps text before the first heading in a chapter named after the book', async () => {
    const book = await convertFile(
      'Livro.docx',
      await docx(wordParagraph('Abertura') + wordParagraph('Um', 'Heading1') + wordParagraph('A')),
    );

    expect(book.chapters.map((chapter) => chapter.title)).toEqual(['Livro', 'Um']);
  });
});

describe('odt', () => {
  it('reads LibreOffice headings written as paragraphs with a heading style or one inheriting it', async () => {
    const content =
      '<office:document-content><office:automatic-styles>' +
      '<style:style style:name="P1" style:family="paragraph" style:parent-style-name="Heading_20_1"/>' +
      '<style:style style:name="P2" style:family="paragraph" style:parent-style-name="Text_20_body"/>' +
      '<style:style style:family="paragraph"/>' +
      '</office:automatic-styles><office:body><office:text>' +
      '<text:p text:style-name="P1">Capítulo 1</text:p><text:p text:style-name="P2">A luz girava.</text:p>' +
      '<text:p text:style-name="Heading_20_1">Capítulo 2</text:p><text:p text:style-name="Text_20_body">Voltou.</text:p>' +
      '</office:text></office:body></office:document-content>';
    const book = await convertFile(
      'farol.odt',
      await createDeflatedZip([
        { name: 'mimetype', data: 'application/vnd.oasis.opendocument.text' },
        { name: 'content.xml', data: content },
      ]),
    );

    expect(book.chapters).toEqual([
      { title: 'Capítulo 1', text: 'A luz girava.' },
      { title: 'Capítulo 2', text: 'Voltou.' },
    ]);
  });

  it('reads headings, paragraphs, spaces, notes and metadata', async () => {
    const content =
      '<office:document-content><office:body><office:text>' +
      '<text:p text:style-name="Title">Título ODT</text:p>' +
      '<text:h text:style-name="H1" text:outline-level="1">Um</text:h>' +
      '<text:p text:style-name="P1">A<text:s text:c="3"/>b<text:s/>c<text:tab/>d<text:line-break/>e' +
      '<text:note><text:note-body><text:p>nota</text:p></text:note-body></text:note></text:p>' +
      '<text:p/>' +
      '<text:h>Dois</text:h><text:p>Fim &amp; tal</text:p>' +
      '</office:text></office:body></office:document-content>';
    const meta = '<office:meta><meta:initial-creator>Bia</meta:initial-creator><dc:title>ODT</dc:title></office:meta>';
    const book = await convertFile(
      'x.odt',
      await createDeflatedZip([
        { name: 'mimetype', data: 'application/vnd.oasis.opendocument.text' },
        { name: 'content.xml', data: content },
        { name: 'meta.xml', data: meta },
      ]),
    );

    expect(book.title).toBe('ODT');
    expect(book.author).toBe('Bia');
    expect(book.chapters).toEqual([
      { title: 'Um', text: 'A b c d\ne' },
      { title: 'Dois', text: 'Fim & tal' },
    ]);
  });

  it('reads dc:creator when there is no initial creator', async () => {
    const book = await convertFile(
      'x.odt',
      await createDeflatedZip([
        { name: 'content.xml', data: '<office:text><text:p>Oi</text:p></office:text>' },
        {
          name: 'meta.xml',
          data: '<office:meta><dc:creator> Caio </dc:creator><meta:initial-creator> </meta:initial-creator></office:meta>',
        },
      ]),
    );

    expect(book.author).toBe('Caio');
    expect(book.title).toBe('x');
  });
});

describe('markdown', () => {
  it('reads front matter, headings, breaks, dialogue lines and strips inline markup', async () => {
    const text = [
      '---',
      'title: "Noite"',
      'author: Ana',
      'other: x',
      '---',
      '# Noite',
      '',
      '## Capítulo 1 ##',
      'Um **forte** e *leve* e __negrito__ e _itálico_ com [link](http://x) e `código`',
      'na mesma linha. ~~riscado~~ ![imagem](a.png) snake_case \\*literal\\*',
      '- Olá, disse ela.',
      '— Oi.',
      '> citação',
      '',
      '***',
      '',
      '---',
      '## Capítulo 2',
      'Fim.',
    ].join('\n');
    const book = await convertFile('n.md', utf8(text));

    expect(book.title).toBe('Noite');
    expect(book.author).toBe('Ana');
    expect(book.chapters).toEqual([
      {
        title: 'Capítulo 1',
        text:
          'Um forte e leve e negrito e itálico com link e código na mesma linha. riscado imagem snake_case *literal*\n' +
          '- Olá, disse ela.\n— Oi. citação\n***\n***',
      },
      { title: 'Capítulo 2', text: 'Fim.' },
    ]);
  });

  it('ignores an unclosed front matter and missing fields', async () => {
    const unclosed = await convertFile('a.md', utf8('---\ntitle: x\ntexto'));

    expect(unclosed.title).toBe('a');
    expect(unclosed.chapters[0].text).toBe('***\ntitle: x texto');

    const noFields = await convertFile('b.md', utf8('---\nfoo: 1\n---\nTexto\r\n'));

    expect(noFields).toEqual({ title: 'b', author: '', chapters: [{ title: 'b', text: 'Texto' }] });
  });
});

describe('html', () => {
  it('reads title, author, headings, paragraphs and breaks without scripts or styles', async () => {
    const html =
      '<html><head><title>Livro &amp; Cia</title><meta name="author" content="Davi &eacute;"><style>p{}</style></head>' +
      '<body><script>var x = "<p>não</p>";</script><!-- <p>comentário</p> -->' +
      '<h1 class="c">Capítulo   <em>1</em></h1><P>Primeira <b>linha</b><br>segunda&hellip;</P><hr/>' +
      '<h2>Sub</h2><p>Mais</p><p></p></body></html>';
    const book = await convertFile('a.html', utf8(html));

    expect(book.title).toBe('Livro & Cia');
    expect(book.author).toBe('Davi é');
    expect(book.chapters).toEqual([
      { title: 'Capítulo 1', text: 'Primeira linha\nsegunda…\n***' },
      { title: 'Sub', text: 'Mais' },
    ]);
  });

  it('falls back to the plain text when there are no paragraphs', async () => {
    const book = await convertFile('a.htm', utf8('<body><div>Um</div><div>Dois<br/>Três</div></body>'));

    expect(book.title).toBe('a');
    expect(book.author).toBe('');
    expect(book.chapters[0].text).toBe('Um\nDois\nTrês');
  });
});

describe('txt', () => {
  it('splits chapters at headings and keeps scene breaks inside them', async () => {
    const text = [
      'Abertura sem capítulo.',
      'Prólogo',
      'Antes de tudo.',
      'CAPÍTULO I - O começo',
      'Texto um.',
      '***',
      'Texto dois.',
      'Chapter 3',
      'Three.',
      'Capítulo 1 começa uma frase muito longa que não é um título porque passa de oitenta caracteres sim',
      'Epílogo.',
      'Fim.',
    ].join('\r\n');
    const book = await convertFile('Meu.txt', utf8(text));

    expect(book.chapters.map((chapter) => chapter.title)).toEqual([
      'Meu',
      'Prólogo',
      'CAPÍTULO I - O começo',
      'Chapter 3',
      'Epílogo.',
    ]);
    expect(book.chapters[2].text).toBe('Texto um.\n***\nTexto dois.');
    expect(book.chapters[3].text).toContain('passa de oitenta');
  });

  it('reads windows-1252 text', async () => {
    const book = await convertFile(
      'a.txt',
      new Uint8Array([0x43, 0x61, 0x70, 0xed, 0x74, 0x75, 0x6c, 0x6f, 0x20, 0x31, 0x0a, 0xe7, 0xe3]),
    );

    expect(book.chapters).toEqual([{ title: 'Capítulo 1', text: 'çã' }]);
  });
});
