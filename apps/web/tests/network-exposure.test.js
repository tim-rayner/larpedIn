import { expect, test } from 'bun:test';
import { readdirSync, readFileSync } from 'node:fs';
import { createHandler } from '../src/app.js';
import { createEditionClient } from '../src/edition-client.js';

// What a visitor can read in DevTools: every JSON response, the HTML, and the shipped scripts.
const NEWS_URL = 'http://news.internal.test';
const post = n => ({
  id: `rss-${n}`, characterId: 'scam-altman', name: 'Scam Altman', company: 'ClosedAI', avatar: 'scam', legacyAvatar: 'you',
  role: 'CEO of ClosedAI | tagline', tagline: 'tagline', location: 'SF', reply: 'r', tag: 'Tech gospel', social: 'Reporter',
  body: [`Summary ${n}.`], tags: '#TechNews', publishedAt: '2026-10-02T00:00:00.000Z',
  sourceUrl: `https://techcrunch.com/2026/10/01/story-${n}/`, sourceName: 'TechCrunch', image: `/api/news-image/${String(n).padStart(20, '0')}`,
  likes: 1, comments: 1, reposts: 1, generated: true,
});
const edition = {
  id: 'aaaaaaaaaaaaaaaa', refreshedAt: Date.parse('2026-10-02T01:00:00Z'), generated: true, stale: true,
  posts: Array.from({length: 8}, (_, i) => post(i + 1)),
  headlines: [{title: 'Headline One', url: 'https://techcrunch.com/2026/10/01/story-1/', author: 'Reporter', publishedAt: '2026-10-02T00:00:00.000Z'}],
};
const handle = createHandler({editions: createEditionClient({baseUrl: NEWS_URL, fetchImpl: async () => Response.json(edition)})});
const get = path => handle(new Request(`http://web.test${path}`));

test('the feed API returns only what the page renders, with no Edition internals', async () => {
  const feed = await (await get('/api/feed')).json();
  expect(Object.keys(feed).sort()).toEqual(['hasMore', 'headlines', 'html', 'nextCursor', 'sourceName', 'status']);
  expect(feed.status).toContain('Showing the last good edition');
  for (const headline of feed.headlines) expect(Object.keys(headline).sort()).toEqual(['postId', 'time', 'title']);
});

test('no response exposes the news service, the publisher or secrets', async () => {
  for (const path of ['/', '/api/feed', '/api/context', '/characters.js']) {
    const body = await (await get(path)).text();
    expect(body).not.toContain(NEWS_URL);
    expect(body).not.toMatch(/techcrunch/i);
    expect(body).not.toMatch(/realCompany|OpenAI|REFRESH_SECRET|UPSTASH|R2_|NEWS_SERVICE_URL/);
  }
});

test('shipped browser scripts reference no environment or secrets', () => {
  const dir = new URL('../public/', import.meta.url);
  for (const file of readdirSync(dir).filter(name => name.endsWith('.js'))) {
    const source = readFileSync(new URL(file, dir), 'utf8');
    expect(source).not.toMatch(/process\.env|NEXT_PUBLIC|NEWS_SERVICE_URL|REFRESH_SECRET|UPSTASH|OPENAI|R2_|api[_-]?key|Bearer /i);
  }
});
