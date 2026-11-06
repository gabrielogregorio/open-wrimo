import type { Editor } from '@tiptap/react';
import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithLocale } from '@/test/render';
import { RichTextEditor } from './rich-text-editor';

type EditorElement = HTMLElement & { editor: Editor };

const image = (size = 10, name = 'scene.png', type = 'image/png'): File => {
  const file = new File(['x'], name, { type });
  Object.defineProperty(file, 'size', { value: size });

  return file;
};

const reply = (ok: boolean, body: { url?: string; error?: string }): Response =>
  ({ ok, json: async () => body }) as Response;

const setup = async (props: { defaultValue?: string; error?: string } = {}) => {
  const view = renderWithLocale(
    <RichTextEditor name="excerpt" label="Excerpt" defaultValue={props.defaultValue ?? ''} error={props.error} />,
  );
  const area = (await screen.findByRole('textbox')) as EditorElement;
  await waitFor(() => {
    expect(area.editor).toBeDefined();
  });
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
  const hidden = (): string => view.container.querySelector<HTMLInputElement>('input[name="excerpt"]')?.value ?? '';

  return { ...view, area, editor: area.editor, hidden };
};

describe('RichTextEditor', () => {
  beforeEach(() => {
    document.elementFromPoint = vi.fn(() => null);
    Range.prototype.getClientRects = vi.fn(() => [] as unknown as DOMRectList);
    Range.prototype.getBoundingClientRect = vi.fn(() => new DOMRect());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('turns plain text into escaped paragraphs and keeps HTML as is', async () => {
    const { hidden, area } = await setup({ defaultValue: 'Tom & Jerry <3\nsecond line\n\nNew paragraph' });

    expect(hidden()).toBe('<p>Tom &amp; Jerry &lt;3<br>second line</p><p>New paragraph</p>');
    expect(area).toHaveAccessibleName('Excerpt');
  });

  it('formats the text with the toolbar and updates the hidden value', async () => {
    const { editor, hidden } = await setup({ defaultValue: '<p>Hello</p>' });

    act(() => {
      editor.commands.selectAll();
    });

    for (const name of ['Bold', 'Italic', 'Underline', 'Strikethrough']) {
      await userEvent.click(screen.getByRole('button', { name }));

      expect(screen.getByRole('button', { name })).toHaveAttribute('aria-pressed', 'true');
    }

    expect(hidden()).toBe('<p><strong><em><s><u>Hello</u></s></em></strong></p>');

    for (const name of ['H2 Heading', 'H3 Subheading', 'Bulleted list', '1. Numbered list', 'Quote']) {
      await userEvent.click(screen.getByRole('button', { name }));
    }

    expect(hidden()).toContain('<blockquote>');

    await userEvent.click(screen.getByRole('button', { name: 'Divider' }));

    expect(hidden()).toContain('<hr>');

    await userEvent.click(screen.getByRole('button', { name: 'Undo' }));

    expect(hidden()).not.toContain('<hr>');

    await userEvent.click(screen.getByRole('button', { name: 'Redo' }));

    expect(hidden()).toContain('<hr>');

    act(() => {
      editor.commands.clearContent(true);
    });

    expect(hidden()).toBe('');
  });

  it('adds only https links and removes an existing one', async () => {
    const prompt = vi.fn<(message?: string, value?: string) => string | null>();
    vi.stubGlobal('prompt', prompt);
    const { editor, hidden } = await setup({ defaultValue: '<p>Read more</p>' });
    const link = screen.getByRole('button', { name: 'Link' });

    act(() => {
      editor.commands.selectAll();
    });
    prompt
      .mockReturnValueOnce(null)
      .mockReturnValueOnce('http://plain.example')
      .mockReturnValueOnce('https://ok.example');
    await userEvent.click(link);
    await userEvent.click(link);

    expect(hidden()).not.toContain('<a');

    await userEvent.click(link);

    expect(prompt).toHaveBeenCalledWith('Link address (https://)', 'https://');
    expect(hidden()).toContain('href="https://ok.example"');
    expect(link).toHaveAttribute('aria-pressed', 'true');

    await userEvent.click(link);

    expect(hidden()).not.toContain('<a');
    expect(prompt).toHaveBeenCalledTimes(3);
  });

  it('uploads a picked image and inserts it, rejecting large files and failed uploads', async () => {
    const pending = Promise.withResolvers<Response>();
    const fetchMock = vi
      .fn<(url: string, init: RequestInit) => Promise<Response>>()
      .mockImplementationOnce(() => pending.promise)
      .mockResolvedValueOnce(reply(false, { error: 'The image could not be read.' }))
      .mockResolvedValueOnce(reply(true, {}));
    vi.stubGlobal('fetch', fetchMock);
    const { container, hidden } = await setup({ defaultValue: '<p>Text</p>' });
    const picker = container.querySelector<HTMLInputElement>('input[type="file"]') as HTMLInputElement;
    const click = vi.spyOn(picker, 'click');

    await userEvent.click(screen.getByRole('button', { name: 'Insert image' }));

    expect(click).toHaveBeenCalled();

    fireEvent.change(picker, { target: { files: [image(5 * 1024 * 1024, 'big.png'), image()] } });

    expect(await screen.findByText('Send an image under 5 MB.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Insert image' })).toHaveTextContent('…');

    await act(async () => {
      pending.resolve(reply(true, { url: '/media/scene.webp' }));
    });

    await waitFor(() => {
      expect(hidden()).toContain('<img src="/media/scene.webp" alt="">');
    });
    expect(screen.getByRole('button', { name: 'Insert image' })).toHaveTextContent('🖼');
    expect(fetchMock.mock.calls[0][0]).toBe('/api/images');
    expect((fetchMock.mock.calls[0][1].body as FormData).get('image')).toBeInstanceOf(File);

    fireEvent.change(picker, { target: { files: [image()] } });

    expect(await screen.findByText('The image could not be read.')).toBeInTheDocument();

    fireEvent.change(picker, { target: { files: [image()] } });

    expect(await screen.findByText('Upload failed')).toBeInTheDocument();
  });

  it('ignores picks without images and shows the form error', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const { container } = await setup({ error: 'Keep the excerpt shorter.' });
    const picker = container.querySelector<HTMLInputElement>('input[type="file"]') as HTMLInputElement;

    fireEvent.change(picker, { target: { files: [new File(['x'], 'notes.txt', { type: 'text/plain' })] } });
    Object.defineProperty(picker, 'files', { configurable: true, value: null });
    fireEvent.change(picker);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.getByText('Keep the excerpt shorter.')).toBeInTheDocument();
  });

  it('handles dropped and pasted images', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => reply(true, { url: '/media/dropped.webp' })),
    );
    const { editor, hidden } = await setup({ defaultValue: '<p>Text</p>' });
    const { view } = editor;
    const handleDrop = view.props.handleDrop as NonNullable<typeof view.props.handleDrop>;
    const handlePaste = view.props.handlePaste as NonNullable<typeof view.props.handlePaste>;
    const drop = (files?: File[]): DragEvent =>
      Object.assign(new Event('drop', { cancelable: true }), {
        clientX: 0,
        clientY: 0,
        dataTransfer: files ? { files } : null,
      }) as unknown as DragEvent;
    const paste = (files?: File[]): ClipboardEvent =>
      Object.assign(new Event('paste'), { clipboardData: files ? { files } : null }) as unknown as ClipboardEvent;
    const slice = view.state.doc.slice(0, 0);
    vi.spyOn(view, 'posAtCoords').mockReturnValueOnce({ pos: 999, inside: -1 }).mockReturnValueOnce(null);

    expect(handleDrop(view, drop([image()]), slice, true)).toBe(false);
    expect(handleDrop(view, drop(), slice, false)).toBe(false);
    expect(handlePaste(view, paste(), slice)).toBe(false);

    const dropped = drop([image()]);

    await act(async () => {
      expect(handleDrop(view, dropped, slice, false)).toBe(true);
    });

    expect(dropped.defaultPrevented).toBe(true);

    await act(async () => {
      expect(handleDrop(view, drop([image()]), slice, false)).toBe(true);
    });
    await act(async () => {
      expect(handlePaste(view, paste([image()]), slice)).toBe(true);
    });

    await waitFor(() => {
      expect(hidden().match(/<img/g)).toHaveLength(3);
    });
  });
});
