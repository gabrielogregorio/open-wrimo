import { downloadFile } from './download';

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
