import { expect, test } from 'bun:test';
import { createHandler } from '../src/app.ts';
import { harness } from './helpers.ts';

const call = (handle: ReturnType<typeof createHandler>, path: string, init?: RequestInit) => handle(new Request(`http://news.test${path}`, init));
const authed = {method: 'POST', headers: {Authorization: 'Bearer test-secret'}};

test('/refresh requires the shared secret and is POST only', async () => {
  const handle = createHandler(harness().services);
  expect((await call(handle, '/refresh', {method: 'POST'})).status).toBe(401);
  expect((await call(handle, '/refresh', {method: 'POST', headers: {Authorization: 'Bearer wrong'}})).status).toBe(401);
  expect((await call(handle, '/refresh')).status).toBe(405);
  expect((await call(createHandler(harness({secret: null}).services), '/refresh', authed)).status).toBe(503);
});

test('/edition is 503 before the first Refresh and serves the current Edition after', async () => {
  const handle = createHandler(harness().services);
  expect((await call(handle, '/edition')).status).toBe(503);
  expect((await call(handle, '/refresh', authed)).status).toBe(200);
  const response = await call(handle, '/edition');
  expect(response.status).toBe(200);
  expect(response.headers.get('cache-control')).toContain('s-maxage=60');
  const edition = await response.json() as {id: string; posts: unknown[]; stale: boolean};
  expect(edition.posts).toHaveLength(3);
  expect(edition.stale).toBe(false);
  expect((await call(handle, `/edition/${edition.id}`)).status).toBe(200);
});

test('an Edition is flagged stale once Refreshes have been missed', async () => {
  const h = harness();
  const handle = createHandler(h.services);
  await call(handle, '/refresh', authed);
  h.clock.now += 3 * 3_600_000;
  expect(((await (await call(handle, '/edition')).json()) as {stale: boolean}).stale).toBe(true);
});

test('unknown or malformed ids are rejected and expired Editions are 404', async () => {
  const handle = createHandler(harness().services);
  expect((await call(handle, '/edition/nope')).status).toBe(400);
  expect((await call(handle, '/edition/0123456789abcdef')).status).toBe(404);
  expect((await call(handle, '/image/short')).status).toBe(400);
  expect((await call(handle, '/image/0123456789abcdef0123')).status).toBe(404);
});

test('stored photos are served as immutable images', async () => {
  const handle = createHandler(harness().services);
  await call(handle, '/refresh', authed);
  const edition = await (await call(handle, '/edition')).json() as {posts: {image: string}[]};
  const id = edition.posts[0]!.image.split('/').pop();
  const response = await call(handle, `/image/${id}`);
  expect(response.status).toBe(200);
  expect(response.headers.get('content-type')).toBe('image/jpeg');
  expect(response.headers.get('cache-control')).toContain('immutable');
  expect(new Uint8Array(await response.arrayBuffer())).toEqual(new Uint8Array([1, 2, 3]));
});
