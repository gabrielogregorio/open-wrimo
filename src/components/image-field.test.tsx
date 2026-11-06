import { fireEvent, screen } from '@testing-library/react';
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
    URL.createObjectURL = vi.fn(() => 'blob:preview');
    URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('previews a chosen image and frees it when a new one is picked', async () => {
    const { container } = renderWithLocale(<ImageField name="image" label="Picture" />);
    const input = screen.getByLabelText('Picture');

    expect(input).toHaveAccessibleDescription('PNG, JPEG, WebP or GIF under 5 MB. It becomes WebP up to 1920×1080.');

    await userEvent.upload(input, image());

    expect(container.querySelector('img')).toHaveAttribute('src', 'blob:preview');

    fireEvent.change(input, { target: { files: [] } });

    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:preview');
    expect(container.querySelector('img')).toBeNull();
  });

  it('rejects an image of 5 MB or more', async () => {
    renderWithLocale(<ImageField name="image" label="Picture" />);
    const input = screen.getByLabelText('Picture');

    await userEvent.upload(input, image(5 * 1024 * 1024));

    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAccessibleDescription(
      'PNG, JPEG, WebP or GIF under 5 MB. It becomes WebP up to 1920×1080. Send an image under 5 MB.',
    );
    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });

  it('accepts a dropped image and ignores drops without one', () => {
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

    expect(container.querySelector('img')).toHaveAttribute('src', 'blob:preview');
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
});
