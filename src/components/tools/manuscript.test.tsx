import { act, fireEvent, screen } from '@testing-library/react';
import type { ToolData } from '@/lib/tools/data';
import { localDb } from '@/lib/tools/local-db';
import { renderWithLocale } from '@/test/render';
import { AUTHOR_KEY } from './export/book-setup';
import { cssString } from './export/print-view';
import { clearDb, draft } from './export/test-drafts';
import Manuscript, { roundedWords, runningHead } from './manuscript';

const data: ToolData = {
  today: '2026-11-08',
  novels: [{ id: 'n1', title: 'A Casa do Rio Seco', totalWords: 10, goals: [] }],
  wordsByDay: [],
};

const flush = async (): Promise<void> => {
  await act(async () => {
    for (let step = 0; step < 5; step += 1) {
      await Promise.resolve();
    }
  });
};

describe('runningHead and roundedWords', () => {
  it('builds the header and rounds the length', () => {
    expect(runningHead('Ana Maria Souza', 'A casa do rio seco')).toBe('Souza / A CASA DO RIO');
    expect(runningHead(' ', 'Livro')).toBe('LIVRO');
    expect(roundedWords(12)).toBe(100);
    expect(roundedWords(1260)).toBe(1300);
    expect(cssString('Ana "A" \\ B')).toBe('"Ana  A    B"');
  });
});

describe('Manuscript', () => {
  beforeEach(async () => {
    await clearDb();
    await localDb().set('draft:b', draft({ id: 'b', title: 'Segundo', order: 2 }));
    await localDb().set('draft:a', draft({ id: 'a', title: 'Primeiro', order: 1 }));
    await localDb().set('draft:c', draft({ id: 'c', title: ' ', novelId: null }));
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:x');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    vi.stubGlobal('print', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('lists the chapters and downloads the .docx', async () => {
    renderWithLocale(<Manuscript data={data} />);

    expect(screen.getByText('Loading your drafts…')).toBeInTheDocument();
    await flush();
    expect(screen.getByText('2 chapters, 8 words')).toBeInTheDocument();
    expect(screen.getAllByRole('listitem').map((item) => item.textContent)).toEqual(['Primeiro', 'Segundo']);

    fireEvent.change(screen.getByLabelText('Author name'), { target: { value: 'Ana Souza' } });
    await flush();
    expect(await localDb().get(AUTHOR_KEY)).toBe('Ana Souza');
    fireEvent.change(screen.getByLabelText('Book title'), { target: { value: 'Outro título' } });
    fireEvent.click(screen.getByRole('button', { name: 'Download .docx' }));

    const blob = vi.mocked(URL.createObjectURL).mock.calls[0][0] as Blob;

    expect(blob.type).toContain('wordprocessingml');
    expect(HTMLAnchorElement.prototype.click).toHaveBeenCalled();
  });

  it('opens a print view, prints it and closes it', async () => {
    await localDb().set(AUTHOR_KEY, 'Ana Souza');
    renderWithLocale(<Manuscript data={data} />);
    await flush();

    fireEvent.click(screen.getByRole('button', { name: 'Print or save as PDF' }));
    const dialog = screen.getByRole('dialog', { name: 'Print view' });

    expect(window.print).toHaveBeenCalledTimes(1);
    expect(dialog).toHaveTextContent('about 100 words');
    expect(dialog.querySelectorAll('h2')).toHaveLength(2);
    expect(dialog.querySelector('style')?.textContent).toContain('"Souza / A CASA DO RIO" " / " counter(page)');
    expect(screen.getAllByText('#')).toHaveLength(2);

    fireEvent.click(screen.getAllByRole('button', { name: 'Print or save as PDF' })[1]);
    expect(window.print).toHaveBeenCalledTimes(2);
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('uses the loose drafts with numbered titles', async () => {
    renderWithLocale(<Manuscript data={{ ...data, novels: [] }} />, 'pt-BR');
    await flush();

    expect(screen.getByLabelText('Título do livro')).toHaveValue('Rascunhos soltos');
    expect(screen.getByText('Capítulo 1')).toBeInTheDocument();
  });

  it('disables export when there are no drafts', async () => {
    await clearDb();
    renderWithLocale(<Manuscript data={data} />);
    await flush();

    expect(screen.getByText(/No drafts here yet/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Download .docx' })).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Drafts from'), { target: { value: '' } });
    expect(screen.getByLabelText('Book title')).toHaveValue('Loose drafts');
  });

  it('ignores the drafts when it closes before loading', async () => {
    const view = renderWithLocale(<Manuscript data={data} />);
    view.unmount();
    await flush();

    expect(screen.queryByText('Loading your drafts…')).not.toBeInTheDocument();
  });
});
