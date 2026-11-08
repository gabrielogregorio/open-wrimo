import { act, fireEvent, screen } from '@testing-library/react';
import { backupZip, makeBackup } from '@/lib/tools/export/backup';
import { readZip, textOf, utf8 } from '@/lib/tools/export/zip';
import { localDb } from '@/lib/tools/local-db';
import { renderWithLocale } from '@/test/render';
import Backup from './backup';
import { clearDb, draft } from './export/test-drafts';

const FAVORITES = 'openwrimo-favorite-tools';

const flush = async (): Promise<void> => {
  await act(async () => {
    for (let step = 0; step < 10; step += 1) {
      await Promise.resolve();
    }
  });
};

const upload = async (bytes: Uint8Array, name: string): Promise<void> => {
  const input = document.querySelector('input[type="file"]') as HTMLInputElement;
  fireEvent.change(input, { target: { files: [new File([new Uint8Array(bytes)], name)] } });
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 20));
  });
};

describe('Backup', () => {
  beforeEach(async () => {
    await clearDb();
    window.localStorage.clear();
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:x');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
  });

  it('downloads every saved entry with the favorites', async () => {
    await localDb().set('draft:a', draft({ id: 'a' }));
    await localDb().set('story:x', { name: 'Ana' });
    window.localStorage.setItem(FAVORITES, '["epub"]');
    renderWithLocale(<Backup />);

    fireEvent.click(screen.getByRole('button', { name: 'Download backup .zip' }));
    await flush();

    const blob = vi.mocked(URL.createObjectURL).mock.lastCall?.[0] as Blob;
    const files = readZip(new Uint8Array(await blob.arrayBuffer()));
    const backup = JSON.parse(textOf(files[0].data)) as { entries: object; localStorage: object };

    expect(files.map((file) => file.name)).toEqual(['backup.json', 'drafts/001-o-comeco.txt']);
    expect(Object.keys(backup.entries)).toEqual(['draft:a', 'story:x']);
    expect(backup.localStorage).toEqual({ [FAVORITES]: '["epub"]' });
    expect(screen.getByRole('status')).toHaveTextContent('Backup saved with 2 items.');
    expect(screen.getByText(/does not include your account data/)).toBeInTheDocument();
  });

  it('sends the backup through the share sheet, or downloads it where files cannot be shared', async () => {
    await localDb().set('draft:a', draft({ id: 'a' }));
    const share = vi.fn(async () => undefined);
    Object.assign(navigator, { share, canShare: () => true });
    renderWithLocale(<Backup />);

    fireEvent.click(screen.getByRole('button', { name: 'Send to another device' }));
    await flush();

    expect(share).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('status')).toHaveTextContent('Backup sent.');

    share.mockRejectedValueOnce(new DOMException('closed', 'AbortError'));
    fireEvent.click(screen.getByRole('button', { name: 'Send to another device' }));
    await flush();

    expect(screen.getByRole('status')).toHaveTextContent('Sending cancelled.');

    Object.assign(navigator, { canShare: () => false });
    fireEvent.click(screen.getByRole('button', { name: 'Send to another device' }));
    await flush();

    expect(URL.createObjectURL).toHaveBeenCalled();
    expect(screen.getByRole('status')).toHaveTextContent('This browser cannot share files');
    Reflect.deleteProperty(navigator, 'share');
    Reflect.deleteProperty(navigator, 'canShare');
  });

  it('shows what a backup brings and restores it after confirming', async () => {
    await localDb().set('draft:a', draft({ id: 'a', text: 'novo', updatedAt: '2026-11-09T00:00:00.000Z' }));
    await localDb().set('draft:b', draft({ id: 'b', text: 'velho' }));
    const backup = makeBackup(
      [
        ['draft:a', draft({ id: 'a', text: 'antigo' })],
        ['draft:b', draft({ id: 'b', text: 'atualizado', updatedAt: '2026-11-05T00:00:00.000Z' })],
        ['story:x', { name: 'Ana' }],
      ],
      { [FAVORITES]: '["heatmap"]' },
      new Date('2026-11-07T12:00:00Z'),
    );
    renderWithLocale(<Backup />);

    await upload(backupZip(backup), 'copia.zip');
    expect(screen.getByText('Backup "copia.zip" from Nov 7, 2026')).toBeInTheDocument();
    expect(screen.getByText('1 new items')).toBeInTheDocument();
    expect(screen.getByText('1 items updated')).toBeInTheDocument();
    expect(screen.getByText('1 drafts kept because the one here is newer')).toBeInTheDocument();
    expect(screen.getByText('1 browser settings')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Restore now' }));
    await flush();

    expect(screen.getByRole('status')).toHaveTextContent('Restored 2 items.');
    expect(await localDb().get('draft:a')).toMatchObject({ text: 'novo' });
    expect(await localDb().get('draft:b')).toMatchObject({ text: 'atualizado' });
    expect(await localDb().get('story:x')).toEqual({ name: 'Ana' });
    expect(window.localStorage.getItem(FAVORITES)).toBe('["heatmap"]');
  });

  it('cancels, refuses bad files and reads bare JSON', async () => {
    renderWithLocale(<Backup />, 'pt-BR');
    fireEvent.click(screen.getByRole('button', { name: 'Baixar backup .zip' }));
    await flush();
    expect(screen.getByRole('status')).toHaveTextContent('Backup salvo com 0 itens.');

    await upload(utf8('{"format":"open-wrimo-tools-backup","entries":{"story:y":1}}'), 'b.json');
    expect(screen.getByText('Backup "b.json"')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(screen.queryByText('Backup "b.json"')).not.toBeInTheDocument();

    await upload(utf8('nada'), 'x.txt');
    expect(screen.getByRole('alert')).toHaveTextContent('Este arquivo não é um backup das ferramentas.');

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [] } });
    await flush();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
