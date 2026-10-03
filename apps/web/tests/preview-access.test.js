import { expect, test } from 'bun:test';
import { createHandler } from '../src/app.js';

const preview = (handle, headers = {}, ip = '203.0.113.7') => handle(new Request('http://web.test/api/posts/preview', {
  method: 'POST', headers: {'content-type': 'application/json', 'x-forwarded-for': ip, ...headers}, body: JSON.stringify({text: 'hello'}),
}));

test('post preview accepts same-origin browser calls', async () => {
  expect((await preview(createHandler(), {origin: 'http://web.test'})).status).toBe(200);
});

test('post preview rejects calls without an Origin or from another origin', async () => {
  const handle = createHandler();
  expect((await preview(handle)).status).toBe(403);
  expect((await preview(handle, {origin: 'https://evil.example'})).status).toBe(403);
});

test('post preview is rate limited per client', async () => {
  const handle = createHandler();
  const statuses = [];
  for (let i = 0; i < 40; i++) statuses.push((await preview(handle, {origin: 'http://web.test'}, '198.51.100.9')).status);
  expect(statuses).toContain(429);
  expect((await preview(handle, {origin: 'http://web.test'}, '198.51.100.10')).status).toBe(200);
});

test('the edition client presents the service token to the news service', async () => {
  const seen = [];
  const fetchImpl = async (url, init) => { seen.push(init.headers.Authorization); return new Response(JSON.stringify({id: '0123456789abcdef', posts: []})); };
  const {createEditionClient} = await import('../src/edition-client.js');
  await createEditionClient({baseUrl: 'http://news.test', token: 'tok', fetchImpl}).getLatest();
  expect(seen).toEqual(['Bearer tok']);
});
