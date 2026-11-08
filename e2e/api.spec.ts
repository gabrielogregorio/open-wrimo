import { expect, test } from '@playwright/test';
import { pngImage, uniqueWriter } from './fixtures';

const PASSWORD = 'a long enough secret';

test('the API signs up, rotates refresh tokens and revokes them on sign out', async ({ request }) => {
  const writer = uniqueWriter('api');
  const registered = await request.post('/api/v1/auth/register', {
    data: { ...writer, password: PASSWORD, acceptTerms: true },
  });
  const tokens = await registered.json();

  expect(registered.status()).toBe(201);
  expect(tokens).toEqual({ accessToken: expect.any(String), refreshToken: expect.any(String), expiresIn: 900 });

  const me = await request.get('/api/v1/me', { headers: { authorization: `Bearer ${tokens.accessToken}` } });
  expect(await me.json()).toMatchObject({ username: writer.username, email: writer.email });
  expect((await request.get('/api/v1/me')).status()).toBe(401);
  expect((await request.get('/api/v1/me', { headers: { authorization: 'Bearer forged' } })).status()).toBe(401);

  const refreshed = await (
    await request.post('/api/v1/auth/refresh', { data: { refreshToken: tokens.refreshToken } })
  ).json();
  expect(refreshed.refreshToken).not.toBe(tokens.refreshToken);

  expect((await request.post('/api/v1/auth/logout', { data: { refreshToken: refreshed.refreshToken } })).status()).toBe(
    204,
  );
  expect(
    (await request.post('/api/v1/auth/refresh', { data: { refreshToken: refreshed.refreshToken } })).status(),
  ).toBe(401);
  expect((await request.post('/api/v1/auth/refresh', { data: {} })).status()).toBe(400);
});

test('the API creates a novel with a cover, a goal and progress', async ({ request }) => {
  const writer = uniqueWriter('apinovel');
  const { accessToken } = await (
    await request.post('/api/v1/auth/register', { data: { ...writer, password: PASSWORD, acceptTerms: true } })
  ).json();
  const headers = { authorization: `Bearer ${accessToken}` };

  const novel = await request.post('/api/v1/novels', {
    headers,
    multipart: {
      title: 'Pela API',
      status: 'in-progress',
      type: 'novel',
      genres: 'Drama',
      cover: { name: 'cover.png', mimeType: 'image/png', buffer: await pngImage() },
    },
  });
  const created = await novel.json();
  expect(novel.status()).toBe(201);
  expect(created.cover).toBe('saved');

  const goal = await request.post(`/api/v1/novels/${created.id}/goals`, {
    headers,
    data: { name: 'Março', unit: 'words', target: '1000', startDate: '2025-03-01', endDate: '2025-03-31', period: '' },
  });
  const goalId = (await goal.json()).id;
  expect(goal.status()).toBe(201);

  const progress = await request.post(`/api/v1/goals/${goalId}/progress`, {
    headers,
    data: { mode: 'add', count: '400', date: '2025-03-05', mood: '', place: '' },
  });
  expect(progress.status()).toBe(201);

  const invalid = await request.post(`/api/v1/goals/${goalId}/progress`, {
    headers,
    data: { mode: 'add', count: '10000001', date: '2025-03-05' },
  });
  expect(invalid.status()).toBe(400);
  expect((await request.post('/api/v1/novels', { multipart: { title: 'x' } })).status()).toBe(401);
});

test('the API accepts two images per second for each writer', async ({ request }) => {
  const writer = uniqueWriter('apirate');
  const { accessToken } = await (
    await request.post('/api/v1/auth/register', { data: { ...writer, password: PASSWORD, acceptTerms: true } })
  ).json();
  const avatar = await pngImage(200, 200);
  const send = () =>
    request.put('/api/v1/profile', {
      headers: { authorization: `Bearer ${accessToken}` },
      multipart: {
        name: writer.name,
        username: writer.username,
        avatar: { name: 'a.png', mimeType: 'image/png', buffer: avatar },
      },
    });

  const results = await Promise.all([send(), send(), send()]);
  const statuses = results.map((result) => result.status()).sort();

  expect(statuses).toEqual([200, 200, 400]);
  const refused = await results.find((result) => result.status() === 400)!.json();
  expect(refused.fieldErrors.avatar).toBe('Wait a second before sending another image.');
});
