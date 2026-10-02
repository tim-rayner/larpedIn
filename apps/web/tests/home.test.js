import { expect, test } from 'bun:test';
import { createHandler } from '../src/app.js';
import { createEditionClient } from '../src/edition-client.js';

const post = (n, extra = {}) => ({
  id: `rss-${n}`, characterId: 'scam-altman', name: 'Scam Altman', company: 'ClosedAI', avatar: 'scam', legacyAvatar: 'you',
  role: 'CEO of ClosedAI | tagline', tagline: 'tagline', location: 'SF', reply: 'r', tag: 'Tech gospel', social: 'Reporter',
  body: [`Summary ${n}.`, `Opinion ${n}.`], tags: '#TechNews #Satire', publishedAt: '2026-10-02T00:00:00.000Z',
  sourceUrl: `https://techcrunch.com/2026/10/01/story-${n}/`, sourceName: 'TechCrunch', image: `/api/news-image/${String(n).padStart(20, '0')}`,
  likes: 100, comments: 5, reposts: 2, generated: true, ...extra,
});
const edition = (id = 'aaaaaaaaaaaaaaaa', count = 8) => ({
  id, refreshedAt: Date.parse('2026-10-02T01:00:00Z'), generated: true, posts: Array.from({length: count}, (_, i) => post(i + 1)),
  headlines: [{title: 'Headline One', url: 'https://techcrunch.com/2026/10/01/story-1/', author: 'Reporter', publishedAt: '2026-10-02T00:00:00.000Z'}],
});

function web({editions = {}, status = 200} = {}) {
  const calls = [];
  const fetchImpl = async url => {
    calls.push(String(url));
    const path = new URL(url).pathname;
    if (status !== 200) return new Response('{}', {status});
    if (path === '/edition') return Response.json(editions.latest ?? edition());
    const id = path.split('/')[2];
    if (path.startsWith('/edition/')) return editions[id] ? Response.json(editions[id]) : new Response('{}', {status: 404});
    if (path.startsWith('/image/')) return new Response(new Uint8Array([9, 9]), {headers: {'content-type': 'image/webp'}});
    return new Response('{}', {status: 404});
  };
  const handle = createHandler({editions: createEditionClient({baseUrl: 'http://news.test', fetchImpl})});
  return {calls, get: (path, init) => handle(new Request(`http://web.test${path}`, init))};
}

test('the home page server-renders the first six Posts of the latest Edition', async () => {
  const {get} = web();
  const response = await get('/');
  const html = await response.text();
  expect(response.headers.get('cache-control')).toContain('s-maxage=60');
  expect(html.match(/class="card post"/g)).toHaveLength(6);
  expect(html).toContain('data-edition="aaaaaaaaaaaaaaaa"');
  expect(html).toContain('data-next-cursor="aaaaaaaaaaaaaaaa.6"');
  expect(html).toContain('Opinion 1.');
  expect(html).toContain('Headline One');
  expect(html).toContain('Freshly overanalysed by AI');
  expect(html).toContain('src="/api/news-image/00000000000000000001"');
});

test('the publisher is hidden by default and shown only with SHOW_NEWS_SOURCE', async () => {
  const {get} = web();
  expect(await (await get('/')).text()).not.toMatch(/techcrunch|Read full story here/i);
  process.env.SHOW_NEWS_SOURCE = 'true';
  try {
    const html = await (await get('/')).text();
    expect(html).toContain('Read full story here');
    expect(html).toContain('href="https://techcrunch.com/2026/10/01/story-1/"');
  } finally { delete process.env.SHOW_NEWS_SOURCE; }
});

test('load-more pages through the same Edition by cursor with no duplicates', async () => {
  const {get} = web();
  const first = await (await get('/api/feed')).json();
  expect(first.nextCursor).toBe('aaaaaaaaaaaaaaaa.6');
  const second = await (await get(`/api/feed?cursor=${first.nextCursor}`)).json();
  expect(second.html.match(/class="card post"/g)).toHaveLength(2);
  expect(second.hasMore).toBe(false);
  expect(second.nextCursor).toBeUndefined();
  const ids = [...first.html.matchAll(/id="(rss-\d+)"/g), ...second.html.matchAll(/id="(rss-\d+)"/g)].map(match => match[1]);
  expect(new Set(ids).size).toBe(8);
});

test('a mid-scroll reader keeps their Edition after a newer one is published', async () => {
  const older = edition('bbbbbbbbbbbbbbbb');
  const {get} = web({editions: {latest: edition('cccccccccccccccc'), bbbbbbbbbbbbbbbb: older}});
  const page = await (await get('/api/feed?cursor=bbbbbbbbbbbbbbbb.6')).json();
  expect(page.editionId).toBe('bbbbbbbbbbbbbbbb');
});

test('an expired or malformed cursor tells the reader to refresh', async () => {
  const {get} = web();
  for (const cursor of ['dddddddddddddddd.6', 'not-a-cursor', 'aaaaaaaaaaaaaaaa.99']) {
    const response = await get(`/api/feed?cursor=${cursor}`);
    expect(response.status).toBe(409);
    expect((await response.json()).error).toMatch(/expired/);
  }
});

test('when the news service is down the house edition is shown, without a retry loop', async () => {
  const {get, calls} = web({status: 503});
  const html = await (await get('/')).text();
  expect(html).not.toContain('data-edition');
  expect(html).toContain('House edition');
  expect(html.match(/class="card post"/g)).toHaveLength(5);
  expect(calls).toHaveLength(1);
  expect((await get('/api/feed')).status).toBe(503);
});

test('with no NEWS_SERVICE_URL the house edition is shown', async () => {
  const handle = createHandler({editions: createEditionClient()});
  const html = await (await handle(new Request('http://web.test/'))).text();
  expect(html).toContain('House edition');
});

test('news photos are fetched from the service and cached as immutable', async () => {
  const {get} = web();
  const response = await get('/api/news-image/00000000000000000001');
  expect(response.status).toBe(200);
  expect(response.headers.get('content-type')).toBe('image/webp');
  expect(response.headers.get('cache-control')).toContain('immutable');
  expect((await get('/api/news-image/bad')).status).toBe(404);
});

test('the latest Edition is cached briefly so busy pages do not fan out to the service', async () => {
  const {get, calls} = web();
  await get('/'); await get('/'); await get('/api/feed');
  expect(calls.filter(call => call.endsWith('/edition'))).toHaveLength(1);
});
