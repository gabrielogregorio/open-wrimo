import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithLocale } from '@/test/render';
import { ImageField } from './image-field';

class FakeDataTransfer {
  private readonly list: File[] = [];

  items = { add: (file: File): void => void this.list.push(file) };

  get files(): FileList {
    return this.list as unknown as FileList;
  }
}

const image = (size = 10, type = 'image/png'): File => {
  const file = new File(['x'], 'cover.png', { type });
  Object.defineProperty(file, 'size', { value: size });

  return file;
};

describe('ImageField', () => {
  beforeEach(() => {
    vi.stubGlobal('DataTransfer', FakeDataTransfer);
    vi.stubGlobal(
      'createImageBitmap',
      vi.fn(async () => ({ width: 1200, height: 800, close: vi.fn() })),
    );
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/webp;base64,preview');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('previews a chosen image as a drawing and clears it when the choice is cleared', async () => {
    const { container } = renderWithLocale(<ImageField name="image" label="Picture" />);
    const input = screen.getByLabelText('Picture');

    expect(input).toHaveAccessibleDescription(
      'PNG, JPEG, WebP or GIF under 5 MB. It becomes WebP up to 1920×1080; GIFs stay animated.',
    );

    await userEvent.upload(input, image());

    await waitFor(() =>
      expect(container.querySelector('img')).toHaveAttribute('src', 'data:image/webp;base64,preview'),
    );

    fireEvent.change(input, { target: { files: [] } });

    expect(container.querySelector('img')).toBeNull();
  });

  it('rejects an image of 5 MB or more', async () => {
    renderWithLocale(<ImageField name="image" label="Picture" />);
    const input = screen.getByLabelText('Picture');

    await userEvent.upload(input, image(5 * 1024 * 1024));

    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAccessibleDescription(
      'PNG, JPEG, WebP or GIF under 5 MB. It becomes WebP up to 1920×1080; GIFs stay animated. Send an image under 5 MB.',
    );
    expect(createImageBitmap).not.toHaveBeenCalled();
  });

  it('accepts a dropped image and ignores drops without one', async () => {
    const { container } = renderWithLocale(<ImageField name="image" label="Picture" />);
    const zone = screen.getByText('Drop an image here or choose a file.').parentElement as HTMLElement;
    Object.defineProperty(screen.getByLabelText('Picture'), 'files', { configurable: true, writable: true, value: [] });

    fireEvent.dragOver(zone);

    expect(zone).toHaveClass('border-accent');

    fireEvent.dragLeave(zone);

    expect(zone).toHaveClass('border-rule');

    fireEvent.drop(zone, { dataTransfer: { files: [new File(['x'], 'notes.txt', { type: 'text/plain' })] } });

    expect(container.querySelector('img')).toBeNull();

    fireEvent.drop(zone, { dataTransfer: { files: [image()] } });

    await waitFor(() =>
      expect(container.querySelector('img')).toHaveAttribute('src', 'data:image/webp;base64,preview'),
    );
  });

  it('shows the current cover as a book with the remove option and the server error', () => {
    renderWithLocale(
      <ImageField
        asBook
        name="cover"
        label="Cover"
        currentUrl="/media/cover.webp"
        error="The image could not be read."
        removeLabel="Remove the cover"
      />,
    );

    expect(screen.getByRole('checkbox', { name: 'Remove the cover' })).toHaveAttribute('name', 'removeCover');
    expect(screen.getByText('The image could not be read.')).toBeInTheDocument();
    expect(document.querySelector('.book-mock img')).toHaveAttribute('src', '/media/cover.webp');
  });

  it('names the remove option for other images', () => {
    renderWithLocale(
      <ImageField name="image" label="Picture" currentUrl="/media/a.webp" removeLabel="Remove the image" />,
    );

    expect(screen.getByRole('checkbox', { name: 'Remove the image' })).toHaveAttribute('name', 'removeImage');
  });

  it('tells that a profile picture becomes a square', () => {
    renderWithLocale(<ImageField name="avatar" label="Profile picture" square />, 'pt-BR');

    expect(screen.getByLabelText('Profile picture')).toHaveAccessibleDescription(
      'PNG, JPEG, WebP ou GIF com menos de 5 MB. Vira um quadrado WebP de 512×512; GIF continua animado.',
    );
  });

  it('shows no preview, and no error of its own, for a file the browser cannot draw', async () => {
    vi.stubGlobal(
      'createImageBitmap',
      vi.fn(async () => Promise.reject(new Error('not an image'))),
    );
    const { container } = renderWithLocale(<ImageField name="image" label="Picture" error="Use a PNG image." />);
    const input = screen.getByLabelText('Picture');

    await userEvent.upload(input, image());
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(container.querySelector('img')).toBeNull();
    expect(screen.getByText('Use a PNG image.')).toBeInTheDocument();
  });

  it('keeps only the preview of the latest pick', async () => {
    const drawings: ((bitmap: unknown) => void)[] = [];
    vi.stubGlobal(
      'createImageBitmap',
      vi.fn(
        () =>
          new Promise((resolve) => {
            drawings.push(resolve);
          }),
      ),
    );
    const { container } = renderWithLocale(<ImageField name="image" label="Picture" />);
    const input = screen.getByLabelText('Picture');

    await userEvent.upload(input, image());
    fireEvent.change(input, { target: { files: [] } });
    drawings[0]({ width: 10, height: 10, close: vi.fn() });

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(container.querySelector('img')).toBeNull();
  });
});
