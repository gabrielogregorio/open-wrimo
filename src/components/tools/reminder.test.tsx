import { act, fireEvent, screen } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { I18nProvider } from '@/components/i18n-provider';
import { localDb } from '@/lib/tools/local-db';
import { REMINDER_KEY } from '@/lib/tools/rhythm/reminder';
import { renderWithLocale } from '@/test/render';
import Reminder from './reminder';

const flush = async (): Promise<void> => {
  await act(async () => {
    for (let step = 0; step < 5; step += 1) {
      await Promise.resolve();
    }
  });
};

const created: { title: string; body: string }[] = [];

const notificationState: { permission: NotificationPermission } = { permission: 'default' };

class FakeNotification {
  static get permission(): NotificationPermission {
    return notificationState.permission;
  }

  static readonly requestPermission = vi.fn(async () => {
    notificationState.permission = 'granted';

    return 'granted' as NotificationPermission;
  });

  constructor(title: string, options: { body: string }) {
    created.push({ title, body: options.body });
  }
}

const withNotification = (permission: NotificationPermission): void => {
  notificationState.permission = permission;
  vi.stubGlobal('Notification', FakeNotification);
};

describe('Reminder', () => {
  beforeEach(async () => {
    created.length = 0;
    await localDb().remove(REMINDER_KEY);
    vi.useFakeTimers({ now: new Date('2026-11-08T19:59:50'), toFake: ['setInterval', 'clearInterval', 'Date'] });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('shows a banner at the writing time when notifications are missing, once a day', async () => {
    vi.stubGlobal('Notification', undefined);
    renderWithLocale(<Reminder />);
    await flush();

    expect(screen.getByText(/does not show notifications/)).toBeInTheDocument();
    expect(screen.getByText(/only works while Open Wrimo is open/)).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Remind me to write'));
    act(() => {
      vi.advanceTimersByTime(30_000);
    });
    expect(screen.getByRole('alert')).toHaveTextContent('Time to write!');
    await flush();
    expect(await localDb().get(REMINDER_KEY)).toMatchObject({ enabled: true, lastShownOn: '2026-11-08' });

    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
    act(() => {
      vi.advanceTimersByTime(30_000);
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('asks for permission and then sends a system notification', async () => {
    withNotification('default');
    renderWithLocale(<Reminder />, 'pt-BR');
    await flush();

    expect(screen.getByText(/Permita as notificações/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Permitir notificações' }));
    await flush();
    expect(screen.getByText(/estão permitidas/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Testar o lembrete agora' }));
    expect(created).toEqual([
      { title: 'Hora de escrever!', body: 'Chegou a sua hora de escrever. Até poucas linhas contam.' },
    ]);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('loads and edits the saved time and weekdays', async () => {
    withNotification('denied');
    await localDb().set(REMINDER_KEY, { enabled: true, time: '07:30', weekdays: [1, 3] });
    renderWithLocale(<Reminder />);
    await flush();

    expect(screen.getByText(/are blocked/)).toBeInTheDocument();
    expect(screen.getByLabelText('Writing time')).toHaveValue('07:30');
    expect(screen.getByRole('button', { name: 'Mon' })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'Mon' }));
    fireEvent.click(screen.getByRole('button', { name: 'Sun' }));
    fireEvent.change(screen.getByLabelText('Writing time'), { target: { value: '20:00' } });
    await flush();
    expect(await localDb().get(REMINDER_KEY)).toMatchObject({ time: '20:00', weekdays: [0, 3] });

    fireEvent.click(screen.getByRole('button', { name: 'Try the reminder now' }));
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('ignores the stored setting when it closes before loading', async () => {
    vi.stubGlobal('Notification', undefined);
    const view = renderWithLocale(<Reminder />);
    view.unmount();
    await flush();

    expect(screen.queryByLabelText('Remind me to write')).not.toBeInTheDocument();
  });

  it('renders the browser without notifications on the server, before the real permission is known', () => {
    const html = renderToString(
      <I18nProvider locale="en-US">
        <Reminder />
      </I18nProvider>,
    );
    const { unmount } = renderWithLocale(<Reminder />);
    unmount();

    expect(html).toContain('Remind me to write');
  });
});
