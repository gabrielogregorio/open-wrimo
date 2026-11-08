import { previewOf } from './image-preview';

const file = new File(['x'], 'cover.png', { type: 'image/png' });

describe('previewOf', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('draws a large picture at most 600 px wide or tall, keeping its shape', async () => {
    const close = vi.fn();
    const drawImage = vi.fn();
    vi.stubGlobal(
      'createImageBitmap',
      vi.fn(async () => ({ width: 1800, height: 1200, close })),
    );
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      drawImage,
    } as unknown as CanvasRenderingContext2D);
    const toDataURL = vi
      .spyOn(HTMLCanvasElement.prototype, 'toDataURL')
      .mockReturnValue('data:image/webp;base64,small');

    await expect(previewOf(file)).resolves.toBe('data:image/webp;base64,small');
    expect(drawImage).toHaveBeenCalledWith(expect.anything(), 0, 0, 600, 400);
    expect(toDataURL).toHaveBeenCalledWith('image/webp', 0.8);
    expect(close).toHaveBeenCalledOnce();
  });

  it('keeps a small picture at its own size, and still answers without a 2D context', async () => {
    vi.stubGlobal(
      'createImageBitmap',
      vi.fn(async () => ({ width: 0, height: 0, close: vi.fn() })),
    );
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/webp;base64,tiny');

    await expect(previewOf(file)).resolves.toBe('data:image/webp;base64,tiny');
  });

  it('gives nothing for a file the browser cannot draw', async () => {
    vi.stubGlobal(
      'createImageBitmap',
      vi.fn(async () => Promise.reject(new Error('not an image'))),
    );

    await expect(previewOf(file)).resolves.toBeNull();
  });
});
