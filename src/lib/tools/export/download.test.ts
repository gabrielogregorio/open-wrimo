import { downloadFile, shareFile } from './download';

describe('downloadFile', () => {
  it('clicks a temporary link to the file and frees the URL later', async () => {
    vi.useFakeTimers();
    const createObjectURL = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:file');
    const revokeObjectURL = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
    const link = { href: '', download: '', rel: '', style: { display: '' }, click: vi.fn(), remove: vi.fn() };
    const append = vi.fn();
    const page = { createElement: vi.fn(() => link), body: { append } } as unknown as Document;

    downloadFile(new Uint8Array([1, 2]), 'livro.epub', 'application/epub+zip', page);
    downloadFile('texto', 'nota.txt', 'text/plain', page);

    expect(link.download).toBe('nota.txt');
    expect(link.href).toBe('blob:file');
    expect(link.click).toHaveBeenCalledTimes(2);
    expect(link.remove).toHaveBeenCalledTimes(2);
    expect(append).toHaveBeenCalledWith(link);
    expect((createObjectURL.mock.calls[0][0] as Blob).type).toBe('application/epub+zip');
    expect(revokeObjectURL).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1000);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:file');
    vi.useRealTimers();
  });
});

describe('shareFile', () => {
  const bytes = new Uint8Array([1, 2, 3]);

  it('hands the file to the share sheet when the browser can share files', async () => {
    const share = vi.fn(async () => undefined);
    const outcome = await shareFile(bytes, 'backup.zip', 'application/zip', { share, canShare: () => true });

    expect(outcome).toBe('shared');
    expect((share.mock.calls[0] as unknown as [ShareData])[0].files?.[0].name).toBe('backup.zip');
  });

  it('tells apart a cancelled share, a failed one and a browser that cannot share files', async () => {
    const cancel = async () => {
      throw new DOMException('closed', 'AbortError');
    };
    const fail = async () => {
      throw new Error('denied');
    };

    expect(await shareFile(bytes, 'b.zip', 'application/zip', { share: cancel, canShare: () => true })).toBe(
      'cancelled',
    );
    expect(await shareFile(bytes, 'b.zip', 'application/zip', { share: fail, canShare: () => true })).toBe(
      'unsupported',
    );
    expect(await shareFile(bytes, 'b.zip', 'application/zip', { share: vi.fn(), canShare: () => false })).toBe(
      'unsupported',
    );
    expect(await shareFile(bytes, 'b.zip', 'application/zip', {})).toBe('unsupported');
    expect(await shareFile(bytes, 'b.zip', 'application/zip', undefined)).toBe('unsupported');
  });

  it('uses the browser navigator by default', async () => {
    expect(await shareFile(bytes, 'b.zip', 'application/zip')).toBe('unsupported');
  });
});
