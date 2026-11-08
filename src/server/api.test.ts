import { ObjectId } from 'mongodb';
import { signAccessToken } from '@/lib/auth/tokens';
import { resetEnvironmentCache } from '@/lib/env';
import { createWriter, pngFile } from '@/test/next-server';
import {
  TERMS_OUTDATED,
  authResponse,
  bearerClaims,
  bearerWriter,
  fileBytes,
  formResponse,
  json,
  readJson,
  requestAddress,
  requestUserAgent,
  stringFields,
  unauthorized,
} from './api';

const SECRET = 'unit-test-secret-that-is-at-least-32-chars';

const withBearer = (token: string, scheme = 'Bearer'): Request =>
  new Request('http://localhost/api', { headers: { authorization: `${scheme} ${token}` } });

const post = (body: string): Request => new Request('http://localhost/api', { method: 'POST', body });

describe('JSON answers', () => {
  it('are never cached', async () => {
    const response = json({ ok: true }, 202);

    expect(response.status).toBe(202);
    expect(response.headers.get('cache-control')).toBe('no-store');
    await expect(response.json()).resolves.toEqual({ ok: true });
    expect(unauthorized().status).toBe(401);
  });
});

describe('bearer tokens', () => {
  it('read only a valid Bearer token', async () => {
    const token = await signAccessToken({ userId: new ObjectId().toHexString(), username: 'ana' }, SECRET, new Date());

    await expect(bearerClaims(new Request('http://localhost/api'))).resolves.toBeNull();
    await expect(bearerClaims(withBearer(token, 'Basic'))).resolves.toBeNull();
    await expect(bearerClaims(withBearer('forged'))).resolves.toBeNull();
    await expect(bearerClaims(withBearer(token))).resolves.toMatchObject({ username: 'ana' });
  });

  it('let in only a live writer who accepted the terms in force', async () => {
    const ghost = await signAccessToken({ userId: new ObjectId().toHexString(), username: 'x' }, SECRET, new Date());
    const leaving = await createWriter({ deletionRequestedAt: new Date() });
    const outdated = await createWriter({ termsVersion: 'old' });
    const writer = await createWriter();

    expect(((await bearerWriter(withBearer('forged'))) as Response).status).toBe(401);
    expect(((await bearerWriter(withBearer(ghost))) as Response).status).toBe(401);
    expect(((await bearerWriter(withBearer(leaving.accessToken))) as Response).status).toBe(401);

    const refused = (await bearerWriter(withBearer(outdated.accessToken))) as Response;
    expect(refused.status).toBe(403);
    await expect(refused.json()).resolves.toEqual({ error: TERMS_OUTDATED });

    await expect(bearerWriter(withBearer(writer.accessToken))).resolves.toMatchObject({ userId: writer.id });
  });
});

describe('request details', () => {
  it('trust X-Forwarded-For only behind a trusted proxy and cut long browser names', () => {
    const request = new Request('http://localhost/api', {
      headers: { 'x-forwarded-for': '203.0.113.9', 'user-agent': 'y'.repeat(320) },
    });

    expect(requestAddress(request)).toBeNull();
    expect(requestUserAgent(request)).toHaveLength(300);
    expect(requestUserAgent(new Request('http://localhost/api'))).toBe('');

    process.env.TRUST_PROXY = 'true';
    resetEnvironmentCache();
    expect(requestAddress(request)).toBe('203.0.113.9');
    process.env.TRUST_PROXY = 'false';
  });
});

describe('readJson', () => {
  it('gives an object, or an empty one for anything else', async () => {
    await expect(readJson(post('{"a":1}'))).resolves.toEqual({ a: 1 });
    await expect(readJson(post('null'))).resolves.toEqual({});
    await expect(readJson(post('7'))).resolves.toEqual({});
    await expect(readJson(post('{broken'))).resolves.toEqual({});
  });
});

describe('authResponse', () => {
  it('answers 400 for a refused form, 429 when blocked and the tokens when it worked', async () => {
    const refused = await authResponse({ ok: false, fieldErrors: { email: 'Enter a valid email address.' } });
    expect(refused.status).toBe(400);
    await expect(refused.json()).resolves.toEqual({ fieldErrors: { email: 'Enter a valid email address.' } });

    const blocked = await authResponse({ ok: false, error: 'Too many tries.', retryAfterMinutes: 15 });
    expect(blocked.status).toBe(429);

    const created = await authResponse(
      { ok: true, userId: new ObjectId().toHexString(), username: 'ana', refreshToken: 'refresh' },
      201,
    );
    expect(created.status).toBe(201);
    await expect(created.json()).resolves.toMatchObject({ refreshToken: 'refresh', expiresIn: 900 });
  });
});

describe('formResponse', () => {
  it('answers 404 for a lone error, 400 for field errors and the id when saved', async () => {
    expect(formResponse({ error: 'This goal no longer exists.' }).status).toBe(404);
    expect(formResponse({ fieldErrors: { name: 'Name it.' } }).status).toBe(400);
    expect(formResponse({ error: 'x', fieldErrors: { name: 'Name it.' } }).status).toBe(400);

    const saved = formResponse({ id: 'abc' }, 201);
    expect(saved.status).toBe(201);
    await expect(saved.json()).resolves.toEqual({ id: 'abc', saved: true });
  });
});

describe('form fields', () => {
  it('keep the text fields and read a non-empty file', async () => {
    const data = new FormData();
    data.append('title', 'Novel');
    data.append('cover', await pngFile());
    data.append('empty', new File([], 'empty.png'));

    expect(stringFields(data)).toEqual({ title: 'Novel' });
    expect((await fileBytes(data, 'cover'))?.length).toBeGreaterThan(0);
    await expect(fileBytes(data, 'empty')).resolves.toBeNull();
    await expect(fileBytes(data, 'title')).resolves.toBeNull();
    await expect(fileBytes(data, 'missing')).resolves.toBeNull();
  });
});
