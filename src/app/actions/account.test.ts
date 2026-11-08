import { ObjectId } from 'mongodb';
import { ACCESS_COOKIE, REFRESH_COOKIE } from '@/lib/auth/tokens';
import { collections } from '@/lib/db/collections';
import { TERMS_VERSION } from '@/lib/legal/terms';
import { accountOf, actAs, createWriter, form, redirectOf, storedCookie, testDb } from '@/test/next-server';
import { acceptTermsAction, cancelDeletionAction, requestDeletionAction } from './account';

const actionsOf = async (userId: string): Promise<string[]> =>
  (
    await collections(testDb())
      .accessLogs.find({ userId: new ObjectId(userId) })
      .toArray()
  ).map((log) => log.action);

describe('account actions', () => {
  it('need a signed-in writer', async () => {
    await expect(redirectOf(() => acceptTermsAction(form({})))).resolves.toBe('/login');
    await expect(redirectOf(() => requestDeletionAction(form({ confirm: 'on' })))).resolves.toBe('/login');
    await expect(redirectOf(cancelDeletionAction)).resolves.toBe('/login');
  });

  it('accept the new terms and go back only to a page of this site', async () => {
    const writer = await createWriter({ termsVersion: 'old' });
    actAs(writer);

    await expect(redirectOf(() => acceptTermsAction(form({ next: '/write/stats' })))).resolves.toBe('/write/stats');
    await expect(redirectOf(() => acceptTermsAction(form({ next: '//evil.example' })))).resolves.toBe('/write');
    expect((await accountOf(writer.id))?.termsVersion).toBe(TERMS_VERSION);
    expect(await actionsOf(writer.id)).toContain('terms');
  });

  it('ask for the box before deleting, then sign out everywhere, and cancel later', async () => {
    const writer = await createWriter();
    actAs(writer);

    await expect(redirectOf(() => requestDeletionAction(form({})))).resolves.toBe('/conta?confirmar=1');
    expect((await accountOf(writer.id))?.deletionRequestedAt).toBeNull();

    await expect(redirectOf(() => requestDeletionAction(form({ confirm: 'on' })))).resolves.toBe('/conta/excluida');
    expect((await accountOf(writer.id))?.deletionRequestedAt).toBeInstanceOf(Date);
    expect(storedCookie(ACCESS_COOKIE)).toBeUndefined();
    expect(storedCookie(REFRESH_COOKIE)).toBeUndefined();
    expect(await collections(testDb()).sessions.countDocuments({ userId: new ObjectId(writer.id) })).toBe(0);

    actAs(writer);
    await expect(redirectOf(cancelDeletionAction)).resolves.toBe('/write');
    expect((await accountOf(writer.id))?.deletionRequestedAt).toBeNull();
    expect(await actionsOf(writer.id)).toEqual(expect.arrayContaining(['deletion-request', 'deletion-cancel']));
  });
});
