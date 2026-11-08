import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DELETED_KEEP_MS, loadDraft, loadSnapshots, newDraft, saveDraft, snapshotKey } from '@/lib/tools/drafts';
import { localDb } from '@/lib/tools/local-db';
import { renderWithLocale } from '@/test/render';
import Drafts, { daysLeft } from './drafts';
import { clearLocalDb, toolData } from './write/test-support';

const minutesAgo = (minutes: number): Date => new Date(Date.now() - minutes * 60_000);

const seed = async (): Promise<void> => {
  const db = localDb();
  await saveDraft(
    db,
    newDraft({ id: 'c2', title: 'Chapter two', now: minutesAgo(10), novelId: 'n1', order: 1, text: 'Dois' }),
  );
  await saveDraft(
    db,
    newDraft({ id: 'c1', title: 'Chapter one', now: minutesAgo(20), novelId: 'n1', order: 0, text: 'Um texto' }),
  );
  await saveDraft(db, newDraft({ id: 'lost', title: 'Lost novel', now: minutesAgo(5), novelId: 'gone' }));
  await saveDraft(db, newDraft({ id: 'loose', title: 'Loose notes', now: minutesAgo(1), text: 'Notas soltas aqui' }));
  await saveDraft(db, {
    ...newDraft({ id: 'trash', title: 'Old idea', now: minutesAgo(60) }),
    deletedAt: minutesAgo(60 * 24).toISOString(),
  });
  await saveDraft(db, {
    ...newDraft({ id: 'expired', title: 'Ancient', now: minutesAgo(1) }),
    deletedAt: new Date(Date.now() - DELETED_KEEP_MS).toISOString(),
  });
  const takenAt = minutesAgo(30).toISOString();
  await db.set(snapshotKey('c1', takenAt), { draftId: 'c1', text: 'Versão antiga', takenAt });
};

const item = (title: string): HTMLElement => screen.getByText(title).closest('li') as HTMLElement;

describe('daysLeft', () => {
  it('counts the days until a deleted draft is gone, at least one', () => {
    const now = new Date('2026-11-08T10:00:00.000Z');

    expect(daysLeft('2026-11-08T10:00:00.000Z', now)).toBe(7);
    expect(daysLeft('2026-11-01T11:00:00.000Z', now)).toBe(1);
    expect(daysLeft('2026-10-01T10:00:00.000Z', now)).toBe(1);
  });
});

describe('Drafts', () => {
  beforeEach(async () => {
    await clearLocalDb();
  });

  it('lists drafts by novel in chapter order and purges expired deletions', async () => {
    await seed();
    renderWithLocale(<Drafts data={toolData} />);

    expect(screen.getByText('Opening your drafts…')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('Chapter one')).toBeInTheDocument());
    const headings = screen.getAllByRole('heading', { level: 2 }).map((heading) => heading.textContent);

    expect(headings).toEqual(['A novel not found', 'Novel', 'No novel', 'Recently deleted']);
    const novel = screen.getByRole('heading', { name: 'Novel' }).closest('section') as HTMLElement;

    expect(
      within(novel)
        .getAllByRole('listitem')
        .map((row) => row.querySelector('p')?.textContent),
    ).toEqual(['Chapter one', 'Chapter two']);
    expect(within(item('Loose notes')).getByText('3 words')).toBeInTheDocument();
    expect(screen.getByText('Gone for good in 6 days')).toBeInTheDocument();
    expect(screen.queryByText('Ancient')).not.toBeInTheDocument();
    expect(await loadDraft(localDb(), 'expired')).toBeUndefined();
  });

  it('shows an empty list and creates a new draft', async () => {
    const user = userEvent.setup();
    renderWithLocale(<Drafts data={toolData} />);
    await waitFor(() => expect(screen.getByText('No drafts yet.')).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: 'New draft' }));

    await waitFor(() => expect(screen.getByRole('textbox', { name: 'Text of Untitled draft' })).toBeInTheDocument());
    expect(screen.queryByText('Recently deleted')).not.toBeInTheDocument();
    expect(screen.getByText('No snapshots yet.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open in the focus editor' }).getAttribute('href')).toMatch(
      /^\/write\/tools\/focus\?draft=/,
    );
  });

  it('edits the title, novel, order and text of a draft', async () => {
    const user = userEvent.setup();
    await seed();
    renderWithLocale(<Drafts data={toolData} />);
    await waitFor(() => expect(screen.getByText('Loose notes')).toBeInTheDocument());
    await user.click(within(item('Loose notes')).getByRole('button', { name: 'Open' }));
    const title = screen.getByRole('textbox', { name: 'Title' });
    await user.clear(title);
    await user.type(title, 'Prologue');
    await user.selectOptions(screen.getByRole('combobox', { name: 'Novel' }), 'n1');
    const order = screen.getByRole('textbox', { name: 'Chapter order' });
    await user.clear(order);
    await user.type(order, '5x');
    await user.type(screen.getByRole('textbox', { name: 'Text of Prologue' }), ' e mais');

    await waitFor(async () => expect((await loadDraft(localDb(), 'loose'))?.text).toBe('Notas soltas aqui e mais'));
    const saved = await loadDraft(localDb(), 'loose');

    expect(saved).toMatchObject({ title: 'Prologue', novelId: 'n1', order: 5 });
    await user.selectOptions(screen.getByRole('combobox', { name: 'Novel' }), '');

    await waitFor(async () => expect((await loadDraft(localDb(), 'loose'))?.novelId).toBeNull());
    await waitFor(() => expect(screen.getAllByText(/· 5 words$/).length).toBeGreaterThan(0));
    await user.click(screen.getByRole('button', { name: 'Close' }));

    expect(screen.queryByRole('textbox', { name: 'Title' })).not.toBeInTheDocument();
  });

  it('saves pending text when the editor closes', async () => {
    const user = userEvent.setup();
    await seed();
    renderWithLocale(<Drafts data={toolData} />);
    await waitFor(() => expect(screen.getByText('Loose notes')).toBeInTheDocument());
    await user.click(within(item('Loose notes')).getByRole('button', { name: 'Open' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Text of Loose notes' }), { target: { value: 'Fechado' } });
    await user.click(screen.getByRole('button', { name: 'Close' }));

    await waitFor(async () => expect((await loadDraft(localDb(), 'loose'))?.text).toBe('Fechado'));
  });

  it('views and restores a snapshot, keeping the replaced text', async () => {
    const user = userEvent.setup();
    await seed();
    renderWithLocale(<Drafts data={toolData} />);
    await waitFor(() => expect(screen.getByText('Chapter one')).toBeInTheDocument());
    await user.click(within(item('Chapter one')).getByRole('button', { name: 'Open' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'View' })).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: 'View' }));

    expect(screen.getByText('Versão antiga')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Hide' }));

    expect(screen.queryByText('Versão antiga')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Restore' }));

    await waitFor(() =>
      expect(screen.getByRole('textbox', { name: 'Text of Chapter one' })).toHaveValue('Versão antiga'),
    );
    expect((await loadSnapshots(localDb(), 'c1')).map((snapshot) => snapshot.text)).toEqual([
      'Um texto',
      'Versão antiga',
    ]);
  });

  it('asks before deleting and brings a deleted draft back', async () => {
    const user = userEvent.setup();
    await seed();
    renderWithLocale(<Drafts data={toolData} />);
    await waitFor(() => expect(screen.getByText('Chapter two')).toBeInTheDocument());
    await user.click(within(item('Chapter two')).getByRole('button', { name: 'Delete' }));

    expect(screen.getByRole('alert')).toHaveTextContent('Delete “Chapter two”? You can bring it back for 7 days.');
    await user.click(screen.getByRole('button', { name: 'Keep it' }));

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    await user.click(within(item('Chapter two')).getByRole('button', { name: 'Delete' }));
    await user.click(screen.getByRole('button', { name: 'Yes, delete' }));

    const trash = await screen.findByRole('heading', { name: 'Recently deleted' });
    const deletedSection = trash.closest('section') as HTMLElement;
    await waitFor(() => expect(within(deletedSection).getByText('Chapter two')).toBeInTheDocument());
    expect(within(deletedSection).getByText('Gone for good in 7 days')).toBeInTheDocument();
    await act(async () => {
      fireEvent.click(within(item('Chapter two')).getByRole('button', { name: 'Bring back' }));
    });

    await waitFor(async () => expect(await loadDraft(localDb(), 'c2')).not.toHaveProperty('deletedAt'));
    expect(within(deletedSection).queryByText('Chapter two')).not.toBeInTheDocument();
  });
});
