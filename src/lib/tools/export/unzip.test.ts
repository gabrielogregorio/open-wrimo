import { createDeflatedZip } from './test-zip';
import { UNZIP_UNREADABLE, inflateRaw, readZipAsync } from './unzip';
import { createZip, textOf, utf8 } from './zip';

const namesAndTexts = (entries: { name: string; data: Uint8Array }[]): string[][] =>
  entries.map((entry) => [entry.name, textOf(entry.data)]);

describe('readZipAsync', () => {
  it('reads deflated entries, with and without data descriptors', async () => {
    const inputs = [
      { name: 'a.xml', data: 'olá '.repeat(50) },
      { name: 'b.txt', data: utf8('fim') },
    ];

    expect(namesAndTexts(await readZipAsync(await createDeflatedZip(inputs)))).toEqual([
      ['a.xml', 'olá '.repeat(50)],
      ['b.txt', 'fim'],
    ]);
    expect(namesAndTexts(await readZipAsync(await createDeflatedZip(inputs, { descriptor: true })))).toHaveLength(2);
  });

  it('reads stored entries made by createZip', async () => {
    const bytes = createZip([{ name: 'mimetype', data: 'x' }]);

    expect(namesAndTexts(await readZipAsync(bytes.subarray(0)))).toEqual([['mimetype', 'x']]);
  });

  it('rejects files that are not zips or are damaged', async () => {
    const good = createZip([{ name: 'a', data: 'abc' }]);
    const endAt = good.length - 22;

    await expect(readZipAsync(utf8('not a zip at all, sorry'))).rejects.toThrow(UNZIP_UNREADABLE);

    const tooMany = good.slice();
    new DataView(tooMany.buffer).setUint16(endAt + 10, 2, true);
    await expect(readZipAsync(tooMany)).rejects.toThrow(UNZIP_UNREADABLE);

    const badCentral = good.slice();
    badCentral[endAt - 47] = 0;
    new DataView(badCentral.buffer).setUint32(endAt + 16, 1, true);
    await expect(readZipAsync(badCentral)).rejects.toThrow(UNZIP_UNREADABLE);

    const centralAt = new DataView(good.buffer).getUint32(endAt + 16, true);
    const badLocal = good.slice();
    badLocal[0] = 0;
    await expect(readZipAsync(badLocal)).rejects.toThrow(UNZIP_UNREADABLE);

    const localOutside = good.slice();
    new DataView(localOutside.buffer).setUint32(centralAt + 42, good.length, true);
    await expect(readZipAsync(localOutside)).rejects.toThrow(UNZIP_UNREADABLE);

    const truncated = good.slice();
    new DataView(truncated.buffer).setUint32(centralAt + 20, 100000, true);
    await expect(readZipAsync(truncated)).rejects.toThrow(UNZIP_UNREADABLE);

    const wrongSize = good.slice();
    new DataView(wrongSize.buffer).setUint32(centralAt + 24, 9, true);
    await expect(readZipAsync(wrongSize)).rejects.toThrow(UNZIP_UNREADABLE);

    const wrongCrc = good.slice();
    wrongCrc[31] = 'z'.charCodeAt(0);
    await expect(readZipAsync(wrongCrc)).rejects.toThrow(UNZIP_UNREADABLE);
  });

  it('rejects unknown methods and broken deflate data', async () => {
    await expect(readZipAsync(await createDeflatedZip([{ name: 'a', data: 'abc' }], { method: 12 }))).rejects.toThrow(
      UNZIP_UNREADABLE,
    );

    const broken = await createDeflatedZip([{ name: 'a', data: 'abc'.repeat(20) }]);
    broken.fill(0xff, 31, 35);
    await expect(readZipAsync(broken)).rejects.toThrow(UNZIP_UNREADABLE);
  });

  it('inflates raw deflate data', async () => {
    const bytes = await createDeflatedZip([{ name: 'a', data: 'abc' }]);
    const packedSize = new DataView(bytes.buffer).getUint32(18, true);

    expect(textOf(await inflateRaw(bytes.subarray(31, 31 + packedSize)))).toBe('abc');
  });
});
