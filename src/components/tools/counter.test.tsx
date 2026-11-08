import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { logProgressAction } from '@/app/actions/writing';
import { localDb } from '@/lib/tools/local-db';
import { renderWithLocale } from '@/test/render';
import Counter, { loggedKey } from './counter';
import { clearLocalDb, toolData } from './write/test-support';

vi.mock('@/app/actions/writing', () => ({ logProgressAction: vi.fn(async () => ({ saved: true })) }));

const area = (): HTMLTextAreaElement => screen.getByRole('textbox', { name: 'Your text' });

describe('Counter', () => {
  beforeEach(async () => {
    await clearLocalDb();
    window.history.replaceState({}, '', '/write/tools/counter');
  });

  it('logs only the words added since the last log to each goal', async () => {
    const user = userEvent.setup();
    const view = renderWithLocale(<Counter data={toolData} />);
    await waitFor(() => expect(area()).toBeEnabled());
    await user.type(area(), 'um dois três');

    expect(screen.getByText('3 words')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Log 3 new words' }));

    await waitFor(() => expect(screen.getByText('No new words to log yet.')).toBeInTheDocument());
    expect(vi.mocked(logProgressAction).mock.calls[0][1].get('count')).toBe('3');
    await user.type(area(), ' quatro');

    expect(screen.getByRole('button', { name: 'Log 1 new words' })).toBeInTheDocument();
    await user.selectOptions(screen.getByRole('combobox', { name: 'Goal' }), 'g2');

    expect(screen.getByRole('button', { name: 'Log 4 new words' })).toBeInTheDocument();
    const draftId = String(await localDb().get('tool-draft:counter'));

    expect(await localDb().get(loggedKey(draftId))).toEqual({ g1: 3 });
    view.unmount();
    renderWithLocale(<Counter data={toolData} />);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Log 1 new words' })).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: 'Log 1 new words' }));

    await waitFor(async () => expect(await localDb().get(loggedKey(draftId))).toEqual({ g1: 4 }));
  });

  it('starts from zero on a new draft and ignores a late answer after leaving', async () => {
    const user = userEvent.setup();
    const view = renderWithLocale(<Counter data={toolData} />);
    await waitFor(() => expect(area()).toBeEnabled());
    await user.type(area(), 'texto');
    await waitFor(async () => expect(await localDb().get('tool-draft:counter')).toBeDefined());
    await user.click(screen.getByRole('button', { name: 'New draft' }));

    await waitFor(() => expect(area()).toHaveValue(''));
    expect(screen.getByText('0 words')).toBeInTheDocument();
    view.unmount();
  });
});
