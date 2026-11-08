import { ObjectId } from 'mongodb';
import { ACCESS_COOKIE, signAccessToken } from '@/lib/auth/tokens';
import { collections } from '@/lib/db/collections';
import { resetEnvironmentCache } from '@/lib/env';
import { TIME_ZONE_COOKIE } from '@/lib/writing/dates';
import { actAs, cookieStore, createWriter, redirectOf, setRequestHeaders, testDb } from '@/test/next-server';
import { currentAdmin } from './admin';
import {
  clientAddress,
  clientInfo,
  currentWriter,
  getAccountStatus,
  getCurrentUser,
  getImageStorage,
  getTimeZone,
  requireUser,
  requireWriter,
  writingContext,
  writingContextFor,
} from './session';

const SECRET = 'unit-test-secret-that-is-at-least-32-chars';

describe('the signed-in user', () => {
  it('is nobody without a cookie or with a forged token', async () => {
    await expect(getCurrentUser()).resolves.toBeNull();

    cookieStore.set(ACCESS_COOKIE, 'not-a-token');
    await expect(getCurrentUser()).resolves.toBeNull();

    const forged = await signAccessToken(
      { userId: new ObjectId().toHexString(), username: 'ghost' },
      'another-secret-that-is-at-least-32-chars!!',
      new Date(),
    );
    cookieStore.set(ACCESS_COOKIE, forged);
    await expect(getCurrentUser()).resolves.toBeNull();
  });

  it('is nobody when a valid token names an account that is gone', async () => {
    cookieStore.set(
      ACCESS_COOKIE,
      await signAccessToken({ userId: new ObjectId().toHexString(), username: 'gone' }, SECRET, new Date()),
    );

    await expect(getCurrentUser()).resolves.toBeNull();
    await expect(redirectOf(requireUser)).resolves.toBe('/login');
  });

  it('is the writer behind a valid token', async () => {
    const writer = await createWriter();
    actAs(writer);

    await expect(requireUser()).resolves.toMatchObject({ id: writer.id, username: writer.username });
  });
});

describe('the gates before writing', () => {
  it('sends a signed-out visitor to sign in', async () => {
    await expect(redirectOf(requireWriter)).resolves.toBe('/login');
    await expect(currentWriter()).resolves.toBe('signed-out');
  });

  it('lets a writer in order through', async () => {
    const writer = await createWriter();
    actAs(writer);

    await expect(requireWriter()).resolves.toMatchObject({ id: writer.id });
    await expect(currentWriter()).resolves.toMatchObject({ id: writer.id });
    await expect(getAccountStatus(writer.id)).resolves.toMatchObject({ isAdmin: false, deletionRequestedAt: null });
  });

  it('sends an account waiting for deletion to its account page', async () => {
    actAs(await createWriter({ deletionRequestedAt: new Date() }));

    await expect(redirectOf(requireWriter)).resolves.toBe('/conta');
    await expect(redirectOf(writingContext)).resolves.toBe('/conta');
    await expect(currentWriter()).resolves.toBe('blocked');
  });

  it('sends an account with old terms to accept the new ones', async () => {
    actAs(await createWriter({ termsVersion: '2020-01-01' }));

    await expect(redirectOf(requireWriter)).resolves.toBe('/termos/aceitar');
    await expect(redirectOf(writingContext)).resolves.toBe('/termos/aceitar');
    await expect(currentWriter()).resolves.toBe('blocked');
  });

  it('opens the admin pages only to an admin in order', async () => {
    await expect(currentAdmin()).resolves.toBeNull();

    actAs(await createWriter());
    await expect(currentAdmin()).resolves.toBeNull();

    actAs(await createWriter({ isAdmin: true, termsVersion: 'old' }));
    await expect(currentAdmin()).resolves.toBeNull();

    const admin = await createWriter({ isAdmin: true });
    actAs(admin);
    await expect(currentAdmin()).resolves.toMatchObject({ id: admin.id });
  });
});

describe('request details', () => {
  it('ignores X-Forwarded-For unless the proxy is trusted', async () => {
    setRequestHeaders({ 'x-forwarded-for': '203.0.113.9, 10.0.0.1', 'user-agent': 'x'.repeat(400) });

    await expect(clientAddress()).resolves.toBeNull();
    await expect(clientInfo()).resolves.toEqual({ address: null, userAgent: 'x'.repeat(300) });

    process.env.TRUST_PROXY = 'true';
    resetEnvironmentCache();
    await expect(clientAddress()).resolves.toBe('203.0.113.9');
    process.env.TRUST_PROXY = 'false';
  });

  it('gives an empty browser name when none is sent', async () => {
    await expect(clientInfo()).resolves.toEqual({ address: null, userAgent: '' });
  });

  it('reads the time zone cookie, falling back to UTC', async () => {
    await expect(getTimeZone()).resolves.toBe('UTC');

    cookieStore.set(TIME_ZONE_COOKIE, 'Europe/Lisbon');
    await expect(getTimeZone()).resolves.toBe('Europe/Lisbon');
  });

  it('keeps one image storage', () => {
    expect(getImageStorage()).toBe(getImageStorage());
  });
});

describe('the writing context', () => {
  it('belongs to the signed-in writer and records each upload', async () => {
    const writer = await createWriter();
    actAs(writer);
    cookieStore.set(TIME_ZONE_COOKIE, 'Asia/Tokyo');
    setRequestHeaders({ 'user-agent': 'Firefox' });

    const context = await writingContext();

    expect(context).toMatchObject({ userId: writer.id, timeZone: 'Asia/Tokyo' });
    expect(context.today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(context.translate?.('Sign in', {})).toBe('Entrar');

    await context.onImageStored?.('covers/a.webp');
    const { accessLogs } = collections(testDb());
    expect(await accessLogs.findOne({ action: 'upload' })).toMatchObject({
      userId: new ObjectId(writer.id),
      detail: 'covers/a.webp',
      userAgent: 'Firefox',
    });
  });

  it('can be built for a writer named by a bearer token', async () => {
    const writer = await createWriter();
    const context = await writingContextFor(writer.id);

    expect(context).toMatchObject({ userId: writer.id, timeZone: 'America/Sao_Paulo' });
    expect((await writingContextFor(writer.id, 'Asia/Tokyo')).timeZone).toBe('Asia/Tokyo');

    await context.onImageStored?.('avatars/b.webp');
    const { accessLogs } = collections(testDb());
    expect(await accessLogs.countDocuments({ action: 'upload', detail: 'avatars/b.webp' })).toBe(1);
  });
});
