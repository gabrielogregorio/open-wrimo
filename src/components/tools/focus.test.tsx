import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { logProgressAction } from '@/app/actions/writing';
import { loadDraft, newDraft, saveDraft } from '@/lib/tools/drafts';
import { localDb } from '@/lib/tools/local-db';
import { renderWithLocale } from '@/test/render';
import Focus, { caretOffset, centerCaret } from './focus';
import { toolDraftKey } from './write/draft-session';
import { clearLocalDb, toolData } from './write/test-support';

vi.mock('@/app/actions/writing', () => ({
  logProgressAction: vi.fn(async () => ({ saved: true })),
  logSprintAction: vi.fn(async () => ({ saved: true })),
}));

const data = toolData;

const area = (): HTMLTextAreaElement => screen.getByRole('textbox', { name: 'Your text' });

const ready = async (): Promise<void> => {
  await waitFor(() => expect(area()).toBeEnabled());
};

describe('Focus', () => {
  beforeEach(async () => {
    await clearLocalDb();
    window.history.replaceState({}, '', '/write/tools/focus');
    vi.mocked(logProgressAction).mockImplementation(async () => ({ saved: true }));
  });

  it('counts words, saves the draft and brings it back after a reload', async () => {
    const user = userEvent.setup();
    const view = renderWithLocale(<Focus data={data} />);
    await ready();

    expect(screen.getByText(/Saved on this device as you type/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'New draft' })).toBeDisabled();
    await user.type(area(), 'Era uma vez');

    expect(screen.getByText('3 words')).toBeInTheDocument();
    expect(screen.getByText(/Saving…/)).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText(/Saved on this device$/)).toBeInTheDocument());
    const draftId = await localDb().get<string>(toolDraftKey('focus'));

    expect((await loadDraft(localDb(), String(draftId)))?.text).toBe('Era uma vez');
    expect(screen.getByText('Focus session 2026-11-08')).toBeInTheDocument();
    view.unmount();
    renderWithLocale(<Focus data={data} />);
    await waitFor(() => expect(area()).toHaveValue('Era uma vez'));

    expect(screen.getByText('0 words in this session')).toBeInTheDocument();
    expect(screen.getByText('No new words to log yet.')).toBeInTheDocument();
    await user.type(area(), ' feliz');
    await waitFor(async () => expect((await loadDraft(localDb(), String(draftId)))?.text).toBe('Era uma vez feliz'));

    expect(screen.getByText('1 words in this session')).toBeInTheDocument();
  });

  it('saves when the page is hidden and starts a new draft', async () => {
    const user = userEvent.setup();
    renderWithLocale(<Focus data={data} />);
    await ready();
    await user.type(area(), 'Uma');
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await waitFor(async () => expect(await localDb().get(toolDraftKey('focus'))).toBeDefined());
    await user.click(screen.getByRole('button', { name: 'New draft' }));

    await waitFor(() => expect(area()).toHaveValue(''));
    expect(await localDb().get(toolDraftKey('focus'))).toBeUndefined();
    expect(screen.getByRole('link', { name: 'All drafts' })).toHaveAttribute('href', '/write/tools/drafts');
  });

  it('opens the draft named in the address and ignores deleted ones', async () => {
    const db = localDb();
    const now = new Date();
    await saveDraft(db, newDraft({ id: 'chosen', title: 'Chapter one', now, text: 'Texto escolhido' }));
    await saveDraft(db, {
      ...newDraft({ id: 'gone', title: 'Gone', now, text: 'Apagado' }),
      deletedAt: now.toISOString(),
    });
    window.history.replaceState({}, '', '/write/tools/focus?draft=chosen');
    const view = renderWithLocale(<Focus data={data} />);
    await waitFor(() => expect(area()).toHaveValue('Texto escolhido'));

    expect(screen.getByText('Chapter one')).toBeInTheDocument();
    expect(await db.get(toolDraftKey('focus'))).toBe('chosen');
    view.unmount();
    window.history.replaceState({}, '', '/write/tools/focus?draft=gone');
    renderWithLocale(<Focus data={data} />);
    await ready();

    expect(area()).toHaveValue('');
  });

  it('stops loading when it leaves before the draft arrives', () => {
    const view = renderWithLocale(<Focus data={data} />);
    view.unmount();

    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('blocks backspace and delete only when asked', async () => {
    renderWithLocale(<Focus data={data} />);
    await ready();

    expect(fireEvent.keyDown(area(), { key: 'Backspace' })).toBe(true);
    fireEvent.click(screen.getByRole('checkbox', { name: 'No backspace' }));

    expect(fireEvent.keyDown(area(), { key: 'Backspace' })).toBe(false);
    expect(fireEvent.keyDown(area(), { key: 'Delete' })).toBe(false);
    expect(fireEvent.keyDown(area(), { key: 'a' })).toBe(true);
    const deletion = new InputEvent('beforeinput', { inputType: 'deleteContentBackward', cancelable: true });
    const insertion = new InputEvent('beforeinput', { inputType: 'insertText', cancelable: true });
    const plain = new Event('beforeinput', { cancelable: true });
    area().dispatchEvent(deletion);
    area().dispatchEvent(insertion);
    area().dispatchEvent(plain);

    expect(deletion.defaultPrevented).toBe(true);
    expect(insertion.defaultPrevented).toBe(false);
    expect(plain.defaultPrevented).toBe(false);
  });

  it('keeps the caret line centered in typewriter mode', async () => {
    const user = userEvent.setup();
    renderWithLocale(<Focus data={data} />);
    await ready();
    await user.click(screen.getByRole('checkbox', { name: 'Typewriter' }));
    await user.type(area(), 'Linha');

    expect(area()).toHaveClass('py-[25dvh]');
    expect(area().scrollTop).toBe(0);
    expect(caretOffset(area())).toBe(0);
    centerCaret(area());

    expect(area().scrollTop).toBe(0);
  });

  it('covers the screen without the Fullscreen API and leaves with Escape', async () => {
    renderWithLocale(<Focus data={data} />);
    await ready();
    fireEvent.click(screen.getByRole('button', { name: 'Full screen' }));

    expect(screen.getByTestId('focus-surface')).toHaveClass('fixed', 'h-[100dvh]');
    fireEvent.keyDown(area(), { key: 'Escape' });

    expect(screen.getByTestId('focus-surface')).not.toHaveClass('fixed');
    fireEvent.keyDown(area(), { key: 'Escape' });

    expect(screen.getByRole('button', { name: 'Full screen' })).toBeInTheDocument();
  });

  it('uses the Fullscreen API and follows the visible area on phones', async () => {
    const viewport = Object.assign(new EventTarget(), { height: 320 });
    Object.defineProperty(window, 'visualViewport', { configurable: true, value: viewport });
    const requestFullscreen = vi.fn(async () => {
      throw new Error('refused');
    });
    const exitFullscreen = vi.fn(async () => undefined);
    Object.defineProperty(HTMLElement.prototype, 'requestFullscreen', { configurable: true, value: requestFullscreen });
    Object.defineProperty(document, 'exitFullscreen', { configurable: true, value: exitFullscreen });
    let fullscreenElement: Element | null = null;
    Object.defineProperty(document, 'fullscreenElement', { configurable: true, get: () => fullscreenElement });
    renderWithLocale(<Focus data={data} />);
    await ready();
    fireEvent.click(screen.getByRole('button', { name: 'Full screen' }));

    expect(requestFullscreen).toHaveBeenCalled();
    act(() => {
      viewport.dispatchEvent(new Event('resize'));
    });

    expect(screen.getByTestId('focus-surface')).toHaveStyle({ height: '320px' });
    fullscreenElement = screen.getByTestId('focus-surface');
    act(() => {
      document.dispatchEvent(new Event('fullscreenchange'));
    });

    expect(screen.getByTestId('focus-surface')).toHaveClass('fixed');
    fireEvent.click(screen.getByRole('button', { name: 'Exit full screen' }));

    expect(exitFullscreen).toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Full screen' }));
    fullscreenElement = null;
    act(() => {
      document.dispatchEvent(new Event('fullscreenchange'));
    });

    expect(screen.getByTestId('focus-surface')).not.toHaveClass('fixed');
    Reflect.deleteProperty(window, 'visualViewport');
    Reflect.deleteProperty(HTMLElement.prototype, 'requestFullscreen');
    Reflect.deleteProperty(document, 'exitFullscreen');
    Reflect.deleteProperty(document, 'fullscreenElement');
  });

  it('logs the words of the session to the chosen goal', async () => {
    const user = userEvent.setup();
    renderWithLocale(<Focus data={data} />);
    await ready();
    await user.type(area(), 'Uma frase curta');
    await user.selectOptions(screen.getByRole('combobox', { name: 'Goal' }), 'g2');
    await user.click(screen.getByRole('button', { name: 'Log 3 words' }));

    await waitFor(() => expect(screen.getByText('Words logged to your goal.')).toBeInTheDocument());
    const formData = vi.mocked(logProgressAction).mock.calls[0][1];

    expect(Object.fromEntries(formData.entries())).toEqual({
      goal: 'g2',
      mode: 'add',
      count: '3',
      date: '2026-11-08',
      mood: '',
      place: '',
    });
    expect(screen.getByText('0 words in this session')).toBeInTheDocument();
  });

  it('shows the errors the server sends back', async () => {
    const user = userEvent.setup();
    vi.mocked(logProgressAction).mockImplementationOnce(async () => ({ error: 'Goal not found.' }));
    vi.mocked(logProgressAction).mockImplementationOnce(async () => ({ fieldErrors: { count: 'Too many.' } }));
    renderWithLocale(<Focus data={data} />);
    await ready();
    await user.type(area(), 'Duas palavras');
    await user.click(screen.getByRole('button', { name: 'Log 2 words' }));

    await waitFor(() => expect(screen.getByText('Goal not found.')).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: 'Log 2 words' }));

    await waitFor(() => expect(screen.getByText('Too many.')).toBeInTheDocument());
    expect(screen.getByText('2 words in this session')).toBeInTheDocument();
  });

  it('asks for a novel with a goal before logging', async () => {
    renderWithLocale(<Focus data={{ ...data, novels: [{ id: 'n', title: 'No goal', totalWords: 0, goals: [] }] }} />);
    await ready();

    expect(screen.getByText(/create a novel with a goal first/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Create a novel' })).toHaveAttribute('href', '/write/novels/new');
  });
});
