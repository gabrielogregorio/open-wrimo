import { sendReportAlert } from './alert';

const settings = { apiKey: 're_test', to: 'admin@example.com', appUrl: 'https://open-wrimo.vercel.app' };

describe('sendReportAlert', () => {
  it('sends the reason and the moderation link through Resend, with no personal data', async () => {
    const send = vi.fn(async () => new Response('{}', { status: 200 }));

    expect(await sendReportAlert(settings, 'spam', send as unknown as typeof fetch)).toBe(true);

    const [url, init] = send.mock.calls[0] as unknown as [string, RequestInit];
    const body = JSON.parse(String(init.body));
    expect(url).toBe('https://api.resend.com/emails');
    expect(init.headers).toMatchObject({ Authorization: 'Bearer re_test' });
    expect(body).toMatchObject({ to: ['admin@example.com'], subject: 'Nova denúncia no Open Wrimo: Spam ou golpe' });
    expect(body.text).toContain('https://open-wrimo.vercel.app/write/admin/reports');
  });

  it('does nothing without settings and never throws when sending fails', async () => {
    const send = vi.fn(async () => {
      throw new Error('offline');
    });

    expect(await sendReportAlert({ appUrl: settings.appUrl }, 'other', send as unknown as typeof fetch)).toBe(false);
    expect(send).not.toHaveBeenCalled();
    expect(await sendReportAlert(settings, 'other', send as unknown as typeof fetch)).toBe(false);
    expect(
      await sendReportAlert(settings, 'other', (async () => new Response('', { status: 403 })) as typeof fetch),
    ).toBe(false);
  });

  it('uses the global fetch by default', async () => {
    const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}', { status: 200 }));

    expect(await sendReportAlert(settings, 'copyright')).toBe(true);
    spy.mockRestore();
  });
});
