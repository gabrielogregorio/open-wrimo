import { act, fireEvent, screen } from '@testing-library/react';
import type { ToolData } from '@/lib/tools/data';
import { readZip, textOf } from '@/lib/tools/export/zip';
import { localDb } from '@/lib/tools/local-db';
import { renderWithLocale } from '@/test/render';
import { AUTHOR_KEY } from './export/book-setup';
import { clearDb, draft } from './export/test-drafts';
import Epub from './epub';

const data: ToolData = {
  today: '2026-11-08',
  novels: [{ id: 'n1', title: 'Noite', totalWords: 10, goals: [] }],
  wordsByDay: [],
};

const flush = async (): Promise<void> => {
  await act(async () => {
    for (let step = 0; step < 5; step += 1) {
      await Promise.resolve();
    }
  });
};

const savedBook = async (): Promise<Record<string, string>> => {
  const blob = vi.mocked(URL.createObjectURL).mock.lastCall?.[0] as Blob;
  const files = readZip(new Uint8Array(await blob.arrayBuffer()));

  return Object.fromEntries(files.map((file) => [file.name, textOf(file.data)]));
};

describe('Epub', () => {
  beforeEach(async () => {
    await clearDb();
    await localDb().set('draft:a', draft({ id: 'a', title: 'Um' }));
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:x');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
  });

  it('builds the book with an unknown author and then with the given one', async () => {
    renderWithLocale(<Epub data={data} />);
    await flush();

    fireEvent.click(screen.getByRole('button', { name: 'Download .epub' }));
    expect((await savedBook())['OEBPS/content.opf']).toContain('<dc:creator>Unknown author</dc:creator>');
    expect(screen.getByRole('status')).toHaveTextContent('Your book was saved.');

    fireEvent.change(screen.getByLabelText('Author name'), { target: { value: 'Ana' } });
    fireEvent.click(screen.getByRole('button', { name: 'Download .epub' }));
    const book = await savedBook();

    expect(book['OEBPS/content.opf']).toContain('<dc:creator>Ana</dc:creator>');
    expect(book['OEBPS/chapter-001.xhtml']).toContain('<h1>Um</h1>');
    expect(await localDb().get(AUTHOR_KEY)).toBe('Ana');
  });
});
