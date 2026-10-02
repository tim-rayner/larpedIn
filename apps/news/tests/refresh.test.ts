import { expect, test } from 'bun:test';
import { imageIdsOf, readCurrentEdition, readEdition } from '../src/editions';
import { refresh } from '../src/refresh';
import { harness, rss } from './helpers';

test('a Refresh builds one Edition of persona Posts with photos and headlines', async () => {
  const {services, images} = harness({feed: () => rss(7)});
  const result = await refresh(services);
  expect(result.status).toBe('published');
  const edition = await readCurrentEdition(services.kv);
  expect(edition?.posts).toHaveLength(7);
  expect(edition?.generated).toBe(true);
  expect(edition?.headlines).toHaveLength(5);
  expect(edition?.posts[0]?.body[0]).toBe('Summary 1.');
  expect(edition?.posts[0]?.body[1]).toBe('Opinion on Story 1.');
  expect(edition?.posts[0]?.image).toMatch(/^\/api\/news-image\/[a-f0-9]{20}$/);
  expect(images.ids()).toHaveLength(7);
});

test('large Editions are generated in bounded three-story batches', async () => {
  const batchSizes: number[] = [];
  const h = harness({feed: () => rss(5)});
  const inner = h.services.fetchImpl;
  h.services.fetchImpl = (async (input: string | URL | Request, init?: RequestInit) => {
    if (String(input).includes('openai')) batchSizes.push((JSON.parse(JSON.parse(String(init?.body)).input) as unknown[]).length);
    return inner(input, init);
  }) as typeof fetch;
  await refresh(h.services);
  expect(batchSizes.sort()).toEqual([2, 3]);
});

test('without a model key every Post uses factual fallback copy', async () => {
  const {services} = harness({openai: false});
  await refresh(services);
  const edition = await readCurrentEdition(services.kv);
  expect(edition?.generated).toBe(false);
  expect(edition?.posts[0]?.generated).toBe(false);
  expect(edition?.posts[0]?.tags).toBe('#TechNews #ThoughtLeadership');
});

test('an unchanged Story is not satirised or downloaded again on the next Refresh', async () => {
  const h = harness({feed: () => rss(3)});
  await refresh(h.services);
  expect(h.calls.openai).toBe(1);
  expect(h.calls.photos).toBe(3);
  h.clock.now += 3_600_000;
  const second = await refresh(h.services);
  expect(second).toMatchObject({status: 'published', newStories: 0});
  expect(h.calls.openai).toBe(1);
  expect(h.calls.photos).toBe(3);
  expect(h.calls.articles).toBe(3);
});

test('only new Stories spend model budget', async () => {
  let items = 3;
  const h = harness({feed: () => rss(items)});
  await refresh(h.services);
  items = 4;
  h.clock.now += 3_600_000;
  expect(await refresh(h.services)).toMatchObject({newStories: 1});
  expect(h.calls.openai).toBe(2);
});

test('Expiry only removes an Edition and its photos once a newer Edition is live', async () => {
  let prefix = 'Alpha';
  const h = harness({feed: () => rss(2, prefix)});
  await refresh(h.services);
  const first = (await readCurrentEdition(h.services.kv))!;
  prefix = 'Bravo';
  h.clock.now += 3_600_000;
  await refresh(h.services);
  const second = (await readCurrentEdition(h.services.kv))!;
  expect(await readEdition(h.services.kv, first.id)).toBeDefined();
  expect(h.images.ids()).toHaveLength(4);

  prefix = 'Charlie';
  h.clock.now += 3_600_000;
  const third = await refresh(h.services);
  expect(third).toMatchObject({status: 'published', expired: [first.id]});
  expect(await readEdition(h.services.kv, first.id)).toBeUndefined();
  expect(await readEdition(h.services.kv, second.id)).toBeDefined();
  for (const id of imageIdsOf(first)) expect(h.images.ids()).not.toContain(id);
  for (const id of imageIdsOf(second)) expect(h.images.ids()).toContain(id);
  expect(h.images.ids()).toHaveLength(4);
});

test('a failed Refresh leaves the last good Edition current and releases the lock', async () => {
  const h = harness();
  await refresh(h.services);
  const good = await readCurrentEdition(h.services.kv);
  const failing = {...h.services, fetchImpl: (async () => new Response('nope', {status: 500})) as unknown as typeof fetch};
  h.clock.now += 3_600_000;
  await expect(refresh(failing)).rejects.toThrow(/RSS request failed/);
  expect(await readCurrentEdition(h.services.kv)).toEqual(good!);
  expect(await refresh(h.services)).toMatchObject({status: 'published'});
});

test('overlapping Refreshes are ignored while one is running', async () => {
  const h = harness();
  const [a, b] = await Promise.all([refresh(h.services), refresh(h.services)]);
  expect([a.status, b.status].sort()).toEqual(['busy', 'published']);
});
