import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import { logProgressAction } from '@/app/actions/writing';
import { renderWithLocale } from '@/test/render';
import DontStop, { rednessAfter } from './dont-stop';
import { clearLocalDb, toolData } from './write/test-support';

vi.mock('@/app/actions/writing', () => ({ logProgressAction: vi.fn(async () => ({ saved: true })) }));

const area = (): HTMLTextAreaElement => screen.getByRole('textbox', { name: 'Your text' });
const tint = (): HTMLElement => screen.getByTestId('dont-stop-tint');
const type = (text: string): void => {
  fireEvent.change(area(), { target: { value: text } });
};
const advance = (milliseconds: number): void => {
  act(() => {
    vi.advanceTimersByTime(milliseconds);
  });
};

describe('rednessAfter', () => {
  it('stays clear until the limit and then deepens over ten seconds', () => {
    expect(rednessAfter(3, 5)).toBe(0);
    expect(rednessAfter(10, 5)).toBe(0.5);
    expect(rednessAfter(40, 5)).toBe(1);
  });
});

describe('DontStop', () => {
  beforeEach(async () => {
    await clearLocalDb();
    window.history.replaceState({}, '', '/write/tools/dont-stop');
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('turns the page red after a pause and clears it when typing resumes', async () => {
    renderWithLocale(<DontStop data={toolData} />);
    await waitFor(() => expect(area()).toBeEnabled());

    expect(screen.getByRole('button', { name: 'Finish' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: '5 s' }));

    expect(screen.getByRole('button', { name: '5 s' })).toHaveAttribute('aria-pressed', 'true');
    type('Uma');
    advance(4_000);

    expect(tint()).toHaveStyle({ opacity: '0' });
    advance(6_000);

    expect(Number(tint().style.opacity)).toBeGreaterThan(0);
    expect(screen.getByText('Keep going!')).toBeInTheDocument();
    type('Uma frase');

    expect(tint()).toHaveStyle({ opacity: '0' });
    expect(screen.getByText('2 words in this session')).toBeInTheDocument();
  });

  it('finishes, logs the words and lets the writer keep going', async () => {
    renderWithLocale(<DontStop data={toolData} />);
    await waitFor(() => expect(area()).toBeEnabled());
    type('Três palavras aqui');
    advance(30_000);
    fireEvent.click(screen.getByRole('button', { name: 'Finish' }));

    expect(tint()).toHaveStyle({ opacity: '0' });
    advance(30_000);

    expect(tint()).toHaveStyle({ opacity: '0' });
    fireEvent.click(screen.getByRole('button', { name: 'Log 3 words' }));

    await waitFor(() => expect(screen.getByText('Words logged to your goal.')).toBeInTheDocument());
    expect(vi.mocked(logProgressAction).mock.calls[0][1].get('count')).toBe('3');
    fireEvent.click(screen.getByRole('button', { name: 'Keep writing' }));

    expect(screen.queryByText('Words logged to your goal.')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Finish' })).toBeEnabled();
  });
});
