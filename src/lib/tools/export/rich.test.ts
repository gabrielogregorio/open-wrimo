import {
  ImageStore,
  attribute,
  cellRuns,
  dataUriImage,
  markupTokens,
  mediaTypeOf,
  normalizeRuns,
  splitAtImages,
  splitElements,
  storeDataUri,
} from './rich';

const PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

describe('ImageStore', () => {
  it('names images in order, reuses keys and skips unknown formats and images past the limit', () => {
    const store = new ImageStore(5);

    expect(store.add(new Uint8Array(2), 'image/png', 'a')).toBe('images/image-001.png');
    expect(store.add(new Uint8Array(2), 'image/png', 'a')).toBe('images/image-001.png');
    expect(store.add(new Uint8Array(2), 'image/jpeg')).toBe('images/image-002.jpg');
    expect(store.add(new Uint8Array(2), 'image/gif')).toBeNull();
    expect(store.add(new Uint8Array(1), 'image/x-emf')).toBeNull();
    expect(store.add(new Uint8Array(1), null)).toBeNull();
    expect(store.images.map((image) => image.mediaType)).toEqual(['image/png', 'image/jpeg']);
    expect(store.skipped).toBe(3);
  });
});

describe('media types and data URIs', () => {
  it('knows image extensions', () => {
    expect(mediaTypeOf('a/b.JPEG')).toBe('image/jpeg');
    expect(mediaTypeOf('x.svg')).toBe('image/svg+xml');
    expect(mediaTypeOf('x.webp')).toBe('image/webp');
    expect(mediaTypeOf('x.emf')).toBeNull();
    expect(mediaTypeOf('')).toBeNull();
  });

  it('reads base64 and percent-encoded data URIs and nothing else', () => {
    expect(dataUriImage(`data:image/png;base64,${PNG}`)?.bytes.slice(1, 4)).toEqual(new Uint8Array([80, 78, 71]));
    expect(dataUriImage('DATA:image/svg+xml,%3Csvg%2F%3E')).toEqual({
      mediaType: 'image/svg+xml',
      bytes: new TextEncoder().encode('<svg/>'),
    });
    expect(dataUriImage('data:image/png;base64,@@@')).toBeNull();
    expect(dataUriImage('data:image/svg+xml,%E0%A4%A')).toBeNull();
    expect(dataUriImage('data:image/png')).toBeNull();
    expect(dataUriImage('http://example.com/a.png')).toBeNull();
  });

  it('counts broken data URIs as skipped and ignores remote images', () => {
    const store = new ImageStore();

    expect(storeDataUri(store, `data:image/png;base64,${PNG}`)).toBe('images/image-001.png');
    expect(storeDataUri(store, 'https://example.com/a.png')).toBeNull();
    expect(store.skipped).toBe(0);
    expect(storeDataUri(store, 'data:image/png;base64,@@@')).toBeNull();
    expect(storeDataUri(store, 'data:text/plain,oi')).toBeNull();
    expect(store.skipped).toBe(2);
  });
});

describe('runs', () => {
  it('collapses spaces, trims lines and joins runs with the same format', () => {
    expect(
      normalizeRuns([
        { text: '  Um \t ' },
        { text: ' dois ', bold: true },
        { text: ' \n três', bold: true },
        { text: '' },
        { text: ' quatro  ', italic: true },
      ]),
    ).toEqual([{ text: 'Um ' }, { text: 'dois\ntrês', bold: true }, { text: ' quatro', italic: true }]);
    expect(normalizeRuns([{ text: ' a ' }, { text: '\nb' }])).toEqual([{ text: 'a\nb' }]);
    expect(normalizeRuns([{ text: '   ' }])).toEqual([]);
  });

  it('keeps only the text of a table cell', () => {
    expect(
      cellRuns([
        { kind: 'text', text: ' A ', bold: true },
        { kind: 'image', src: 'images/a.png', alt: 'A' },
      ]),
    ).toEqual([{ text: 'A', bold: true }]);
  });

  it('splits paragraphs at images', () => {
    expect(
      splitAtImages([
        { kind: 'text', text: 'Antes ' },
        { kind: 'image', src: 'images/a.png', alt: 'A' },
        { kind: 'text', text: ' depois', italic: true },
      ]),
    ).toEqual([
      { text: 'Antes' },
      { text: '', block: { kind: 'image', src: 'images/a.png', alt: 'A' } },
      { text: 'depois', block: { kind: 'paragraph', runs: [{ text: 'depois', italic: true }] } },
    ]);
  });
});

describe('splitElements and attribute', () => {
  it('keeps nested elements inside the outer one and ignores look-alike tags', () => {
    expect(splitElements('a<t:x><t:xPr/><t:x>b</t:x></t:x>c<t:x/>d</t:x>', 't:x')).toEqual([
      { inside: false, xml: 'a' },
      { inside: true, xml: '<t:x><t:xPr/><t:x>b</t:x></t:x>' },
      { inside: false, xml: 'c<t:x/>d</t:x>' },
    ]);
    expect(splitElements('<t:x>open', 't:x')).toEqual([{ inside: false, xml: '<t:x>open' }]);
  });

  it('cuts markup into tags and text, even when a tag is not closed', () => {
    expect(markupTokens('a<b>c</b><d')).toEqual(['a', '<b>', 'c', '</b>', '<d']);
  });

  it('reads attributes in double or single quotes', () => {
    expect(attribute('<img src="a.png" alt=\'b\'>', 'alt')).toBe('b');
    expect(attribute('<img src="a.png">', 'SRC')).toBe('a.png');
    expect(attribute('<img>', 'alt')).toBe('');
  });
});
