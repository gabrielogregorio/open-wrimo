import { act, fireEvent, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ToolData } from '@/lib/tools/data';
import { MAX_FILE_BYTES, type ConvertedBook } from '@/lib/tools/export/convert';
import { readZip, textOf } from '@/lib/tools/export/zip';
import { renderWithLocale } from '@/test/render';
import ConverterTool from './converter';

const data: ToolData = { today: '2026-11-08', novels: [], wordsByDay: [] };

const savedBook = async (): Promise<Record<string, string>> => {
  const blob = vi.mocked(URL.createObjectURL).mock.lastCall?.[0] as Blob;
  const files = readZip(new Uint8Array(await blob.arrayBuffer()));

  return Object.fromEntries(files.map((file) => [file.name, textOf(file.data)]));
};

const textFile = (text: string, name: string): File => new File([text], name, { type: 'text/plain' });

const fileInput = (): HTMLInputElement => screen.getByLabelText(/Choose a file/) as HTMLInputElement;

describe('ConverterTool', () => {
  beforeEach(() => {
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:x');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
  });

  it('converts a text file and downloads an ePub with the edited title and author', async () => {
    const user = userEvent.setup();
    renderWithLocale(<ConverterTool data={data} />);

    expect(screen.getByText(/the file is never sent anywhere/)).toBeInTheDocument();
    expect(screen.getByText(/Kindle accepts EPUB since 2022/)).toBeInTheDocument();

    await user.upload(fileInput(), textFile('Capítulo 1\nUm dois três.\nCapítulo 2\nQuatro.', 'Meu livro.txt'));

    expect(await screen.findByText('File: Meu livro.txt')).toBeInTheDocument();
    expect(screen.getByLabelText('Book title')).toHaveValue('Meu livro');
    expect(screen.getByText('2 chapters, 4 words')).toBeInTheDocument();
    expect(screen.getByText('(3 words)')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Download .epub' }));
    let book = await savedBook();

    expect(book['OEBPS/content.opf']).toContain('<dc:creator>Unknown author</dc:creator>');
    expect(book['OEBPS/content.opf']).toContain('<dc:title>Meu livro</dc:title>');
    expect(book['OEBPS/toc.ncx']).toContain('Capítulo 2');
    expect(screen.getByText(/Your book was saved/)).toBeInTheDocument();

    await user.clear(screen.getByLabelText('Book title'));
    await user.type(screen.getByLabelText('Book title'), 'Outro');
    await user.type(screen.getByLabelText('Author name'), 'Ana');
    await user.click(screen.getByRole('checkbox', { name: /Kindle-friendly/ }));
    await user.click(screen.getByRole('button', { name: 'Download .epub' }));
    book = await savedBook();

    expect(book['OEBPS/content.opf']).toContain('<dc:creator>Ana</dc:creator>');
    expect(book['OEBPS/content.opf']).toContain('<dc:title>Outro</dc:title>');
    expect(book['OEBPS/toc.ncx']).toBeUndefined();

    await user.clear(screen.getByLabelText('Book title'));
    await user.click(screen.getByRole('button', { name: 'Download .epub' }));
    expect((await savedBook())['OEBPS/content.opf']).toContain('<dc:title>Meu livro</dc:title>');
  });

  it('shows errors for unsupported, empty, too big and unreadable files', async () => {
    const user = userEvent.setup({ applyAccept: false });
    const { unmount } = renderWithLocale(<ConverterTool data={data} />);

    await user.upload(fileInput(), textFile('x', 'a.pdf'));
    expect(await screen.findByRole('alert')).toHaveTextContent('This kind of file is not supported.');

    await user.upload(fileInput(), textFile('# Livro\nTexto', 'a.md'));
    expect(await screen.findByText('File: a.md')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    await user.upload(fileInput(), textFile('   ', 'vazio.txt'));
    expect(await screen.findByRole('alert')).toHaveTextContent('No text was found in this file.');
    expect(screen.queryByText('File: a.md')).not.toBeInTheDocument();

    const big = textFile('x', 'grande.txt');
    Object.defineProperty(big, 'size', { value: MAX_FILE_BYTES + 1 });
    await user.upload(fileInput(), big);
    expect(await screen.findByRole('alert')).toHaveTextContent('This file is larger than 20 MB.');
    unmount();

    const failing = vi.fn().mockRejectedValue(new Error('boom'));
    renderWithLocale(<ConverterTool data={data} convert={failing} />);
    await user.upload(fileInput(), textFile('x', 'a.docx'));
    expect(await screen.findByRole('alert')).toHaveTextContent('This file could not be read.');
    expect(failing).toHaveBeenCalledWith('a.docx', expect.any(Uint8Array));
  });

  it('reads a dropped file and shows progress while reading', async () => {
    const { promise: pending, resolve: finish } = Promise.withResolvers<ConvertedBook>();
    renderWithLocale(<ConverterTool data={data} convert={() => pending} />);
    const zone = screen.getByText('Choose a file or drop it here').closest('label') as HTMLLabelElement;

    fireEvent.dragOver(zone);
    expect(zone.className).toContain('border-accent');
    fireEvent.dragLeave(zone);
    expect(zone.className).not.toContain('border-accent');

    fireEvent.drop(zone, { dataTransfer: { files: [] } });
    expect(screen.getByRole('status')).toHaveTextContent('');

    await act(async () => {
      fireEvent.drop(zone, { dataTransfer: { files: [textFile('x', 'solto.txt')] } });
      await Promise.resolve();
    });
    expect(screen.getByRole('status')).toHaveTextContent('Reading the file…');

    await act(async () => {
      finish({ title: 'Solto', author: 'Bia', chapters: [{ title: 'Um', text: 'Texto' }] });
      await pending;
    });
    expect(screen.getByLabelText('Author name')).toHaveValue('Bia');
    expect(screen.getByRole('status')).toHaveTextContent('');
  });

  it('ignores an empty file selection', () => {
    renderWithLocale(<ConverterTool data={data} />);
    fireEvent.change(fileInput(), { target: { files: [] } });

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
