import { convertFile } from './convert';
import { createDeflatedZip } from './test-zip';
import { utf8 } from './zip';

const PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
const PNG_BYTES = Uint8Array.from(atob(PNG), (character) => character.charCodeAt(0));
const PNG_URI = `data:image/png;base64,${PNG}`;
const W = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"';

const wrap = (before: string, value: string, after: string): string => (value ? before + value + after : '');

const run = (text: string, properties = ''): string =>
  `<w:r>${wrap('<w:rPr>', properties, '</w:rPr>')}<w:t xml:space="preserve">${text}</w:t></w:r>`;

const paragraph = (runs: string, style = ''): string =>
  `<w:p>${wrap('<w:pPr><w:pStyle w:val="', style, '"/></w:pPr>')}${runs}</w:p>`;

const drawing = (id: string, descr = ''): string =>
  `<w:r><w:drawing><wp:inline><wp:docPr id="1" name="Imagem"${wrap(' descr="', descr, '"')}/>` +
  `<a:graphic><pic:pic><pic:blipFill><a:blip r:embed="${id}"/></pic:blipFill></pic:pic></a:graphic></wp:inline></w:drawing></w:r>`;

describe('docx formatting', () => {
  it('keeps bold, italic, styles, images and tables', async () => {
    const styles =
      `<w:styles ${W}><w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/>` +
      '<w:rPr><w:b/></w:rPr></w:style>' +
      '<w:style w:type="character" w:styleId="Strong"><w:name w:val="Strong"/><w:rPr><w:b/></w:rPr></w:style>' +
      '<w:style w:type="paragraph" w:styleId="Quote"><w:name w:val="Quote"/><w:rPr><w:i/></w:rPr></w:style>' +
      '<w:style w:type="paragraph" w:styleId="Normal"><w:name w:val="Normal"/></w:style></w:styles>';
    const rels =
      '<Relationships><Relationship Id="rId5" Type="image" Target="media/image1.png"/>' +
      '<Relationship Id="rId6" Type="image" Target="http://x/a.png" TargetMode="External"/>' +
      '<Relationship Id="rId7" Type="image" Target="/word/media/missing.png"/>' +
      '<Relationship Id="rId8" Type="image" Target="./media/../media/pic.emf"/></Relationships>';
    const cell = (content: string): string => `<w:tc><w:tcPr/>${content}</w:tc>`;
    const table =
      '<w:tbl><w:tblPr/><w:tblGrid/>' +
      `<w:tr>${cell(paragraph(run('Nome', '<w:b/>')))}${cell(paragraph(run('Idade'), 'Quote'))}</w:tr>` +
      `<w:tr>${cell(paragraph(run('Ana')) + paragraph(run('Silva', '<w:i/>')))}${cell(paragraph(drawing('rId5')))}</w:tr>` +
      `<w:tr>${cell('<w:tbl><w:tr>' + cell(paragraph(run('dentro'))) + '</w:tr></w:tbl>')}</w:tr>` +
      '</w:tbl>';
    const body = [
      paragraph(run('Capítulo 1'), 'Heading1'),
      paragraph(
        run('Era ') +
          run('uma', '<w:b/>') +
          run(' vez', '<w:i w:val="true"/>') +
          run(' sem', '<w:b w:val="0"/><w:bCs/>') +
          run(' forte', '<w:rStyle w:val="Strong"/>'),
      ),
      paragraph(run('Citação ') + run('reta', '<w:i w:val="0"/>'), 'Quote'),
      paragraph(run('Texto simples.')),
      paragraph(run('Veja:') + drawing('rId5', 'Um &amp; gato')),
      paragraph(drawing('rId5') + drawing('rId6') + drawing('rId7') + drawing('rId8') + drawing('rId9')),
      `<w:p><w:r><w:pict><v:shape><v:imagedata r:id="rId5" o:title=""/></v:shape></w:pict></w:r></w:p>`,
      table,
    ].join('');
    const book = await convertFile(
      'livro.docx',
      await createDeflatedZip([
        { name: 'word/document.xml', data: `<w:document ${W}><w:body>${body}</w:body></w:document>` },
        { name: 'word/styles.xml', data: styles },
        { name: 'word/_rels/document.xml.rels', data: rels },
        { name: 'word/media/image1.png', data: PNG_BYTES },
        { name: 'word/media/pic.emf', data: new Uint8Array([1, 2, 3]) },
      ]),
    );
    const image = { kind: 'image', src: 'images/image-001.png', alt: '' };

    expect(book.images).toEqual([{ path: 'images/image-001.png', mediaType: 'image/png', bytes: PNG_BYTES }]);
    expect(book.skippedImages).toBe(2);
    expect(book.chapters).toHaveLength(1);
    expect(book.chapters[0].title).toBe('Capítulo 1');
    expect(book.chapters[0].text).toBe(
      'Era uma vez sem forte\nCitação reta\nTexto simples.\nVeja:\nNome | Idade\nAna\nSilva | \ndentro',
    );
    expect(book.chapters[0].content).toEqual([
      {
        kind: 'paragraph',
        runs: [
          { text: 'Era ' },
          { text: 'uma', bold: true },
          { text: ' vez', italic: true },
          { text: ' sem' },
          { text: ' forte', bold: true },
        ],
      },
      { kind: 'paragraph', runs: [{ text: 'Citação ', italic: true }, { text: 'reta' }] },
      { kind: 'paragraph', runs: [{ text: 'Texto simples.' }] },
      { kind: 'paragraph', runs: [{ text: 'Veja:' }] },
      { ...image, alt: 'Um & gato' },
      image,
      image,
      {
        kind: 'table',
        rows: [
          [[{ text: 'Nome', bold: true }], [{ text: 'Idade', italic: true }]],
          [[{ text: 'Ana\n' }, { text: 'Silva', italic: true }], []],
          [[{ text: 'dentro' }]],
        ],
      },
    ]);
  });

  it('leaves plain documents without rich content or images', async () => {
    const book = await convertFile(
      'a.docx',
      await createDeflatedZip([
        { name: 'word/document.xml', data: `<w:document ${W}><w:body>${paragraph(run('Oi'))}</w:body></w:document>` },
      ]),
    );

    expect(book).toEqual({ title: 'a', author: '', chapters: [{ title: 'a', text: 'Oi' }] });
  });
});

describe('odt formatting', () => {
  it('keeps spans with bold or italic styles, pictures and tables', async () => {
    const styles =
      '<office:document-styles><office:styles>' +
      '<style:style style:name="Strong_20_Emphasis" style:family="text"><style:text-properties fo:font-weight="bold"/></style:style>' +
      '<style:style style:name="Quotations" style:family="paragraph"><style:text-properties fo:font-style="italic"/></style:style>' +
      '</office:styles></office:document-styles>';
    const content =
      '<office:document-content><office:automatic-styles>' +
      '<style:style style:name="T1" style:family="text" style:parent-style-name="Strong_20_Emphasis"/>' +
      '<style:style style:name="T2" style:family="text"><style:text-properties fo:font-style="oblique"/></style:style>' +
      '<style:style style:name="T3" style:family="text"><style:text-properties fo:font-weight="700"/></style:style>' +
      '<style:style style:name="T4" style:family="text"><style:text-properties fo:font-weight="normal" fo:font-style="normal"/></style:style>' +
      '<style:style style:name="T5" style:family="text" style:parent-style-name="T5"><style:paragraph-properties/></style:style>' +
      '</office:automatic-styles><office:body><office:text>' +
      '<text:h text:outline-level="1">Um</text:h>' +
      '<text:p></text:span>A <text:span text:style-name="T1">forte <text:span text:style-name="T2">e leve</text:span></text:span>' +
      '<text:span text:style-name="T3"/> e <text:span text:style-name="T3">grosso</text:span>' +
      '<text:span text:style-name="T5">.</text:span><!-- nota --><text:s text:c="2"/>x<text:tab/>y<text:line-break/>z</text:p>' +
      '<text:p text:style-name="Quotations">Citação <text:span text:style-name="T4">reta</text:span></text:p>' +
      '<text:p>Antes<draw:frame draw:name="f1"><draw:image xlink:href="Pictures/a.png"/><svg:title>Gato</svg:title>' +
      '<svg:desc> preto</svg:desc></draw:frame>depois<draw:image xlink:href="Pictures/solta.png"/></text:p>' +
      '<text:p><draw:frame><draw:image xlink:href="./Pictures/a.png"/></draw:frame>' +
      '<draw:frame><draw:image xlink:href="Pictures/falta.png"/></draw:frame><draw:frame><draw:text-box/></draw:frame></text:p>' +
      '<table:table table:name="T"><table:table-column/><table:table-header-rows><table:table-row>' +
      '<table:table-cell><text:p><text:span text:style-name="T1">Nome</text:span></text:p></table:table-cell>' +
      '<table:table-cell><text:p text:style-name="Quotations">Idade</text:p><text:p>anos</text:p></table:table-cell></table:table-row></table:table-header-rows>' +
      '<table:table-row><table:table-cell><text:p>Ana<draw:frame><draw:image xlink:href="Pictures/a.png"/></draw:frame></text:p>' +
      '</table:table-cell><table:covered-table-cell/></table:table-row></table:table>' +
      '<text:p>Fim.</text:p>' +
      '</office:text></office:body></office:document-content>';
    const book = await convertFile(
      'x.odt',
      await createDeflatedZip([
        { name: 'mimetype', data: 'application/vnd.oasis.opendocument.text' },
        { name: 'content.xml', data: content },
        { name: 'styles.xml', data: styles },
        { name: 'Pictures/a.png', data: PNG_BYTES },
      ]),
    );
    const image = { kind: 'image', src: 'images/image-001.png', alt: '' };

    expect(book.images).toHaveLength(1);
    expect(book.skippedImages).toBe(1);
    expect(book.chapters[0].text).toBe(
      'A forte e leve e grosso. x y\nz\nCitação reta\nAntes\ndepois\nNome | Idade\nanos\nAna\nFim.',
    );
    expect(book.chapters[0].content).toEqual([
      {
        kind: 'paragraph',
        runs: [
          { text: 'A ' },
          { text: 'forte ', bold: true },
          { text: 'e leve', bold: true, italic: true },
          { text: ' e ' },
          { text: 'grosso', bold: true },
          { text: '. x y\nz' },
        ],
      },
      { kind: 'paragraph', runs: [{ text: 'Citação ', italic: true }, { text: 'reta' }] },
      { kind: 'paragraph', runs: [{ text: 'Antes' }] },
      { ...image, alt: 'Gato preto' },
      { kind: 'paragraph', runs: [{ text: 'depois' }] },
      image,
      {
        kind: 'table',
        rows: [
          [[{ text: 'Nome', bold: true }], [{ text: 'Idade', italic: true }, { text: '\nanos' }]],
          [[{ text: 'Ana' }]],
        ],
      },
      { kind: 'paragraph', runs: [{ text: 'Fim.' }] },
    ]);
  });
});

describe('markdown formatting', () => {
  it('keeps emphasis, data URI images and pipe tables', async () => {
    const text = [
      '# Um',
      'Um **forte** e *leve* e __negrito__ e _itálico_ e ***ambos*** com [link **x**](http://a) e `có*digo*`.',
      'snake_case, 2 * 3, ** solto, *sem fim, _x_y e fim\\',
      '',
      `Antes ![Gato](${PNG_URI} "título") depois ![remoto](https://x/a.png) e ![quebrado](data:image/png;base64,@@@).`,
      '',
      'Sem fim: `aberto e [colchete e ![imagem sem alvo] e ~~riscado~~.',
      '',
      'Final _itálico_ * e _fim_',
      '',
      'Solto *',
      '',
      '| Nome | **Idade** |',
      '|:-----|------:|',
      `| Ana \\| Bia | ![i](${PNG_URI}) |`,
      'Leo | 9',
      '',
      'a | b',
      '--- | ---',
    ].join('\n');
    const book = await convertFile('n.md', utf8(text));

    expect(book.images).toHaveLength(1);
    expect(book.skippedImages).toBe(1);
    expect(book.chapters[0].title).toBe('Um');
    expect(book.chapters[0].content).toEqual([
      {
        kind: 'paragraph',
        runs: [
          { text: 'Um ' },
          { text: 'forte', bold: true },
          { text: ' e ' },
          { text: 'leve', italic: true },
          { text: ' e ' },
          { text: 'negrito', bold: true },
          { text: ' e ' },
          { text: 'itálico', italic: true },
          { text: ' e ' },
          { text: 'ambos', bold: true, italic: true },
          { text: ' com link ' },
          { text: 'x', bold: true },
          { text: ' e có*digo*. snake_case, 2 * 3, ** solto, *sem fim, _x_y e fim\\' },
        ],
      },
      { kind: 'paragraph', runs: [{ text: 'Antes' }] },
      { kind: 'image', src: 'images/image-001.png', alt: 'Gato' },
      { kind: 'paragraph', runs: [{ text: 'depois remoto e quebrado.' }] },
      { kind: 'paragraph', runs: [{ text: 'Sem fim: `aberto e [colchete e ![imagem sem alvo] e riscado.' }] },
      {
        kind: 'paragraph',
        runs: [{ text: 'Final ' }, { text: 'itálico', italic: true }, { text: ' * e ' }, { text: 'fim', italic: true }],
      },
      { kind: 'paragraph', runs: [{ text: 'Solto *' }] },
      {
        kind: 'table',
        rows: [
          [[{ text: 'Nome' }], [{ text: 'Idade', bold: true }]],
          [[{ text: 'Ana | Bia' }], [{ text: 'i' }]],
          [[{ text: 'Leo' }], [{ text: '9' }]],
        ],
      },
      { kind: 'table', rows: [[[{ text: 'a' }], [{ text: 'b' }]]] },
    ]);
  });
});

describe('html formatting', () => {
  it('keeps b, strong, i, em, data URI images and tables', async () => {
    const html =
      '<body><h1>Um</h1><p>Um <b>forte</b> <STRONG>e</STRONG> <i>leve</i> <em>x</em></b><br><span>linha</span><!x></p>' +
      `<p>antes <img src="${PNG_URI}" alt="Gato &amp; cia"> depois <img src="http://x/a.png" alt="remoto"></p>` +
      `<img alt="solta" src='${PNG_URI}'>` +
      `<table><tr><th>A</th><td><b>B</b> <img src="${PNG_URI}" alt="c"></td></tr><tr><td>1</td></tr></table>` +
      '<HR></body>';
    const book = await convertFile('a.html', utf8(html));
    const image = (number: number, alt: string) => ({ kind: 'image', src: `images/image-00${number}.png`, alt });

    expect(book.images).toHaveLength(2);
    expect(book.skippedImages).toBeUndefined();
    expect(book.chapters[0].text).toBe('Um forte e leve x\nlinha\nantes\ndepois remoto\nA | B c\n1\n***');
    expect(book.chapters[0].content).toEqual([
      {
        kind: 'paragraph',
        runs: [
          { text: 'Um ' },
          { text: 'forte', bold: true },
          { text: ' ' },
          { text: 'e', bold: true },
          { text: ' ' },
          { text: 'leve', italic: true },
          { text: ' ' },
          { text: 'x', italic: true },
          { text: '\nlinha' },
        ],
      },
      { kind: 'paragraph', runs: [{ text: 'antes' }] },
      image(1, 'Gato & cia'),
      { kind: 'paragraph', runs: [{ text: 'depois remoto' }] },
      image(2, 'solta'),
      {
        kind: 'table',
        rows: [[[{ text: 'A' }], [{ text: 'B', bold: true }, { text: ' c' }]], [[{ text: '1' }]]],
      },
      { kind: 'break' },
    ]);
  });

  it('accepts a book that is only an image', async () => {
    const book = await convertFile('a.html', utf8(`<p><img src="${PNG_URI}" alt="capa"></p>`));

    expect(book.chapters).toEqual([
      { title: 'a', text: '', content: [{ kind: 'image', src: 'images/image-001.png', alt: 'capa' }] },
    ]);
  });
});
