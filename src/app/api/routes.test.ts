import { resetEnvironmentCache } from '@/lib/env';
import { createWritingRepository } from '@/lib/writing/repository';
import { actAs, createWriter, form, pngFile, testDb, type TestWriter } from '@/test/next-server';
import { GET as exportNotebook } from './export/route';
import { GET as health } from './health/route';
import { POST as uploadImage } from './images/route';
import { POST as login } from './v1/auth/login/route';
import { POST as logout } from './v1/auth/logout/route';
import { POST as refresh } from './v1/auth/refresh/route';
import { POST as register } from './v1/auth/register/route';
import { POST as logProgress } from './v1/goals/[id]/progress/route';
import { GET as me } from './v1/me/route';
import { POST as createGoal } from './v1/novels/[id]/goals/route';
import { POST as createNovel } from './v1/novels/route';
import { PUT as updateProfile } from './v1/profile/route';
import { GET as media } from '../media/[...key]/route';

const PASSWORD = 'a long enough secret';
const GOAL = { name: 'November', unit: 'words', target: 50000, startDate: '2026-11-01', endDate: '2026-11-30' };
const ENTRY = { mode: 'add', count: 700, date: '2026-11-05' };

const call = (body: unknown, token?: string, method = 'POST'): Request =>
  new Request('http://localhost/api', {
    method,
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  });

const send = (data: FormData, token?: string, method = 'POST'): Request =>
  new Request('http://localhost/api', {
    method,
    headers: token ? { authorization: `Bearer ${token}` } : {},
    body: data,
  });

const params = <Value>(value: Value) => ({ params: Promise.resolve(value) });

const writing = () => createWritingRepository(testDb());

const novelOf = async (writer: TestWriter): Promise<string> => {
  const response = await createNovel(
    send(form({ title: 'Young Love', status: 'in-progress', type: 'novel', genres: 'Drama' }), writer.accessToken),
  );

  return ((await response.json()) as { id: string }).id;
};

describe('health', () => {
  it('answers ok', async () => {
    await expect(health().json()).resolves.toEqual({ status: 'ok' });
  });
});

describe('auth API', () => {
  it('signs up, signs in, rotates and revokes refresh tokens', async () => {
    const fields = { name: 'Ana', username: 'ana', email: 'ana@example.com', password: PASSWORD, acceptTerms: 'on' };
    const created = await register(call(fields));
    expect(created.status).toBe(201);

    const signedIn = await login(call({ email: 'ana@example.com', password: PASSWORD }));
    const tokens = (await signedIn.json()) as { accessToken: string; refreshToken: string };
    expect(signedIn.status).toBe(200);
    expect((await login(call({ email: 'ana@example.com', password: 'wrong password!' }))).status).toBe(400);

    expect((await refresh(call({}))).status).toBe(400);
    expect((await refresh(call({ refreshToken: 'unknown' }))).status).toBe(401);
    const rotated = await refresh(call({ refreshToken: tokens.refreshToken }));
    const next = (await rotated.json()) as { refreshToken: string };
    expect(rotated.status).toBe(200);

    expect((await logout(call({}))).status).toBe(204);
    expect((await logout(call({ refreshToken: next.refreshToken }))).status).toBe(204);
    expect((await refresh(call({ refreshToken: next.refreshToken }))).status).toBe(401);
  });

  it('says who the token belongs to', async () => {
    const writer = await createWriter();

    expect((await me(call(undefined, 'forged', 'GET'))).status).toBe(401);
    expect((await me(new Request('http://localhost/api'))).status).toBe(401);
    await expect(
      (
        await me(new Request('http://localhost/api', { headers: { authorization: `Bearer ${writer.accessToken}` } }))
      ).json(),
    ).resolves.toMatchObject({ id: writer.id, username: writer.username });
  });
});

describe('writing API', () => {
  it('creates a novel, with a cover or with a refused one, and refuses a broken form', async () => {
    const writer = await createWriter();
    const cover = await pngFile();

    const covered = await createNovel(
      send(form({ title: 'A', status: 'in-progress', type: 'novel', genres: 'Drama', cover }), writer.accessToken),
    );
    expect(covered.status).toBe(201);
    await expect(covered.json()).resolves.toMatchObject({ cover: 'saved' });

    const refused = await createNovel(
      send(
        form({ title: 'B', status: 'in-progress', type: 'novel', genres: 'Drama', cover: new File(['nope'], 'x.png') }),
        writer.accessToken,
      ),
    );
    await expect(refused.json()).resolves.toMatchObject({ cover: { cover: expect.any(String) } });

    const plain = await createNovel(
      send(form({ title: 'C', status: 'in-progress', type: 'novel', genres: 'Drama' }), writer.accessToken),
    );
    await expect(plain.json()).resolves.toMatchObject({ cover: 'none' });

    expect((await createNovel(send(form({ title: '' }), writer.accessToken))).status).toBe(400);
  });

  it('adds goals and progress to the writer’s own novel', async () => {
    const writer = await createWriter();
    const novelId = await novelOf(writer);

    const goal = await createGoal(call(GOAL, writer.accessToken), params({ id: novelId }));
    const { id: goalId } = (await goal.json()) as { id: string };
    expect(goal.status).toBe(201);

    expect((await logProgress(call(ENTRY, writer.accessToken), params({ id: goalId }))).status).toBe(201);
    expect(
      (await logProgress(call({ ...ENTRY, source: 'sprint' }, writer.accessToken), params({ id: goalId }))).status,
    ).toBe(201);
    expect((await writing().listEntries(writer.id)).map((entry) => entry.source).sort()).toEqual(['sprint', 'update']);
  });

  it('updates the profile', async () => {
    const writer = await createWriter();
    const fields = { name: 'Ana Lima', username: 'ana-lima', bio: '', location: '', pronouns: '' };

    const saved = await updateProfile(send(form({ ...fields, show: 'bio' }), writer.accessToken, 'PUT'));
    expect(saved.status).toBe(200);
    expect((await writing().getProfile(writer.id)).shown).toMatchObject({ bio: true, stats: false });
    expect((await updateProfile(send(form({ ...fields, username: 'A B' }), writer.accessToken, 'PUT'))).status).toBe(
      400,
    );
  });

  it('never reaches another writer’s novel or goal', async () => {
    const owner = await createWriter();
    const novelId = await novelOf(owner);
    const goalResponse = await createGoal(call(GOAL, owner.accessToken), params({ id: novelId }));
    const { id: goalId } = (await goalResponse.json()) as { id: string };
    const intruder = await createWriter();

    expect((await createGoal(call(GOAL, intruder.accessToken), params({ id: novelId }))).status).toBe(404);
    expect((await logProgress(call(ENTRY, intruder.accessToken), params({ id: goalId }))).status).toBe(404);
    expect((await logProgress(call(ENTRY, intruder.accessToken), params({ id: 'not-an-id' }))).status).toBe(404);
    expect(await writing().listGoals(owner.id)).toHaveLength(1);
    expect(await writing().listEntries(owner.id)).toEqual([]);
  });

  it('turns away a missing token, an account waiting for deletion and one with old terms', async () => {
    const leaving = await createWriter({ deletionRequestedAt: new Date() });
    const outdated = await createWriter({ termsVersion: 'old' });
    const novel = form({ title: 'A', status: 'in-progress', type: 'novel', genres: 'Drama' });

    expect((await createNovel(send(novel))).status).toBe(401);
    expect((await createNovel(send(novel, leaving.accessToken))).status).toBe(401);
    expect((await createNovel(send(novel, outdated.accessToken))).status).toBe(403);
    expect((await createGoal(call(GOAL, outdated.accessToken), params({ id: 'x' }))).status).toBe(403);
    expect((await logProgress(call(ENTRY, outdated.accessToken), params({ id: 'x' }))).status).toBe(403);
    expect((await updateProfile(send(form({}), outdated.accessToken, 'PUT'))).status).toBe(403);
  });
});

describe('export', () => {
  it('needs a session and gives only the writer’s own notebook, even while the account is blocked', async () => {
    expect((await exportNotebook()).status).toBe(401);

    const other = await createWriter();
    await novelOf(other);
    const writer = await createWriter({ termsVersion: 'old' });
    actAs(writer);

    const response = await exportNotebook();
    const body = (await response.json()) as { projects: unknown[]; exportedAt: string };

    expect(response.headers.get('content-disposition')).toMatch(
      /^attachment; filename="open-wrimo-\d{4}-\d{2}-\d{2}\.json"$/,
    );
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(body.projects).toEqual([]);
    expect(body.exportedAt).toMatch(/Z$/);
  });
});

describe('inline images', () => {
  const upload = (file?: File) => uploadImage(send(file ? form({ image: file }) : form({})));

  it('need a writer in order', async () => {
    expect((await upload(await pngFile())).status).toBe(401);

    actAs(await createWriter({ termsVersion: 'old' }));
    const refused = await upload(await pngFile());
    expect(refused.status).toBe(403);
    await expect(refused.json()).resolves.toEqual({
      error: 'Aceite os novos Termos de Uso, ou cancele a exclusão da sua conta, para enviar imagens.',
    });
  });

  it('take a real image and refuse anything else', async () => {
    actAs(await createWriter());

    expect((await upload()).status).toBe(400);
    expect((await upload(new File(['nope'], 'x.png'))).status).toBe(400);
    const stored = await upload(await pngFile());
    await expect(stored.json()).resolves.toMatchObject({ url: expect.stringMatching(/^\/media\//) });
  });
});

describe('media', () => {
  const read = (key: string) => media(new Request('http://localhost/media'), params({ key: key.split('/') }));

  it('serves stored images with nosniff and a long cache, and nothing else', async () => {
    const writer = await createWriter();
    actAs(writer);
    const { url } = (await (await uploadImage(send(form({ image: await pngFile() })))).json()) as { url: string };

    const image = await read(url.replace('/media/', ''));
    expect(image.status).toBe(200);
    expect(image.headers.get('x-content-type-options')).toBe('nosniff');
    expect(image.headers.get('cache-control')).toContain('immutable');
    expect((await read('posts/missing.webp')).status).toBe(404);
    expect((await read('../../etc/passwd')).status).toBe(404);
  });

  it('is off when images live in the cloud', async () => {
    process.env.STORAGE_DRIVER = 'cloudinary';
    process.env.CLOUDINARY_URL = 'cloudinary://key:secret@cloud';
    resetEnvironmentCache();

    expect((await read('posts/a.webp')).status).toBe(404);

    process.env.STORAGE_DRIVER = 'local';
    delete process.env.CLOUDINARY_URL;
  });
});
