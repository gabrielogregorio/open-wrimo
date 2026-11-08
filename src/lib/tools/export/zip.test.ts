import { ZIP_UNREADABLE, crc32, createZip, isZip, readZip, textOf, utf8 } from './zip';

const MODIFIED = new Date('2026-11-08T13:45:30.000Z');

describe('crc32', () => {
  it('matches the known checksums', () => {
    expect(crc32(utf8(''))).toBe(0);
    expect(crc32(utf8('123456789'))).toBe(0xcbf43926);
    expect(crc32(utf8('The quick brown fox jumps over the lazy dog'))).toBe(0x414fa339);
  });
});

describe('createZip and readZip', () => {
  it('stores files that read back the same, with the right headers', () => {
    const bytes = createZip(
      [
        { name: 'mimetype', data: 'application/epub+zip' },
        { name: 'capítulo/um.txt', data: utf8('Era uma vez, ação.') },
      ],
      MODIFIED,
    );
    const view = new DataView(bytes.buffer);

    expect(isZip(bytes)).toBe(true);
    expect(view.getUint32(0, true)).toBe(0x04034b50);
    expect(view.getUint16(6, true)).toBe(0);
    expect(view.getUint16(8, true)).toBe(0);
    expect(view.getUint32(14, true)).toBe(crc32(utf8('application/epub+zip')));
    expect(view.getUint16(28, true)).toBe(0);
    expect(textOf(bytes.subarray(30, 38))).toBe('mimetype');
    expect(textOf(bytes.subarray(38, 58))).toBe('application/epub+zip');
    expect(view.getUint16(10, true)).toBe((13 << 11) | (45 << 5) | 15);
    expect(view.getUint16(12, true)).toBe((46 << 9) | (11 << 5) | 8);
    expect(view.getUint32(bytes.length - 22, true)).toBe(0x06054b50);
    expect(view.getUint16(bytes.length - 12, true)).toBe(2);

    const entries = readZip(bytes);

    expect(entries.map((entry) => entry.name)).toEqual(['mimetype', 'capítulo/um.txt']);
    expect(textOf(entries[1].data)).toBe('Era uma vez, ação.');
    const secondLocal = 30 + 8 + 20;

    expect(view.getUint16(secondLocal + 6, true)).toBe(0x0800);
  });

  it('writes an empty zip and uses the current date by default', () => {
    expect(readZip(createZip([]))).toEqual([]);
    expect(readZip(createZip([{ name: 'a.txt', data: 'a' }], new Date('1970-01-01T00:00:00Z')))).toHaveLength(1);
  });

  it('refuses what it cannot read', () => {
    const good = createZip([{ name: 'a.txt', data: 'abc' }], MODIFIED);
    const brokenCrc = good.slice();
    brokenCrc[30 + 5] = 'x'.charCodeAt(0);
    const compressed = good.slice();
    new DataView(compressed.buffer).setUint16(good.length - 22 - 51 + 10, 8, true);
    const wrongCentral = good.slice();
    new DataView(wrongCentral.buffer).setUint32(good.length - 22 - 51, 0, true);
    const wrongCount = good.slice();
    new DataView(wrongCount.buffer).setUint16(good.length - 22 + 10, 2, true);
    const wrongLocal = good.slice();
    new DataView(wrongLocal.buffer).setUint32(0, 0, true);
    const truncated = good.slice();
    new DataView(truncated.buffer).setUint32(good.length - 22 - 51 + 20, 99, true);

    for (const bytes of [
      brokenCrc,
      compressed,
      wrongCentral,
      wrongCount,
      wrongLocal,
      truncated,
      utf8('not a zip'),
      utf8('x'.repeat(40)),
    ]) {
      expect(() => readZip(bytes)).toThrow(ZIP_UNREADABLE);
    }

    expect(isZip(utf8('P'))).toBe(false);
    expect(isZip(utf8('PX..'))).toBe(false);
    expect(isZip(utf8('XK..'))).toBe(false);
  });
});
