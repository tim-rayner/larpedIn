import { createHash } from 'node:crypto';
import type { Edition, Headline, Post } from './shared';
import type { Services } from './config';
import { lockKey, publishEdition, readCurrentEdition } from './editions';
import { ensureStoryImage } from './images';
import { toPost } from './posts';
import { parseTechCrunchRss } from './rss';
import { generateSatire } from './satire';
import { chooseSatireTemplates } from './satire-templates';
import type { Story } from './types';

const LOCK_SECONDS = 300;
const IMAGE_CONCURRENCY = 6;

export type RefreshResult =
  | {status: 'busy'}
  | {status: 'published'; id: string; posts: number; generatedPosts: number; newStories: number; expired: string[]};

async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T, index: number) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(Array.from({length: Math.min(limit, items.length)}, async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await fn(items[index] as T, index);
    }
  }));
  return results;
}

async function fetchStories({fetchImpl, feedUrl, maxItems}: Services): Promise<Story[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);
  try {
    const response = await fetchImpl(feedUrl, {signal: controller.signal, headers: {'User-Agent': 'LarpedIn/0.1 RSS reader'}});
    if (!response.ok) throw new Error(`RSS request failed (${response.status})`);
    const stories = parseTechCrunchRss(await response.text(), maxItems);
    if (!stories.length) throw new Error('RSS feed contained no usable stories');
    return stories;
  } finally { clearTimeout(timeout); }
}

const publishedTime = (story: Story) => (story.publishedAt ? Date.parse(story.publishedAt) : Number.NEGATIVE_INFINITY);

/** Feed order: most recent first, stories without a date last. */
export const newestFirst = (stories: Story[]): Story[] => [...stories].sort((a, b) => publishedTime(b) - publishedTime(a));

/**
 * Builds a new Edition from the latest Stories and makes it current.
 * Posts already satirised by the model are reused, so only new Stories spend model budget.
 */
export async function refresh(services: Services): Promise<RefreshResult> {
  const {kv, images, fetchImpl, log, now, random} = services;
  if (!(await kv.setIfAbsent(lockKey, LOCK_SECONDS))) return {status: 'busy'};
  try {
    const stories = newestFirst(await fetchStories(services));
    const previous = await readCurrentEdition(kv);
    const reusable = new Map<string, Post>((previous?.posts ?? []).filter(post => post.generated).map(post => [post.sourceUrl, post]));

    const fresh = stories.filter(story => !reusable.has(story.url));
    const templates = chooseSatireTemplates(fresh.length, random);
    const generated = fresh.length
      ? await generateSatire(fresh, templates, {...(services.openaiApiKey ? {apiKey: services.openaiApiKey} : {}), model: services.openaiModel, fetchImpl, log})
          .catch(error => { log.warn(`Satire generation unavailable: ${(error as Error).message}`); return undefined; })
      : [];
    const generatedByUrl = new Map(fresh.map((story, index) => [story.url, generated?.[index]]));

    const posts = await mapLimit(stories, IMAGE_CONCURRENCY, async story => {
      const image = await ensureStoryImage(story, {images, fetchImpl, log});
      const kept = reusable.get(story.url);
      return kept ? {...kept, ...(image ? {image: `/api/news-image/${image.id}`} : {})} : toPost(story, generatedByUrl.get(story.url), image);
    });

    const refreshedAt = now();
    const id = createHash('sha256').update(`${stories.map(story => story.url).join('\n')}|${refreshedAt}`).digest('hex').slice(0, 16);
    const headlines: Headline[] = stories.slice(0, 5).map(({title, url, author, publishedAt}) => ({title, url, ...(author ? {author} : {}), ...(publishedAt ? {publishedAt} : {})}));
    const edition: Edition = {id, refreshedAt, generated: posts.some(post => post.generated), posts, headlines};
    const {expired} = await publishEdition(kv, images, edition);
    return {status: 'published', id, posts: posts.length, generatedPosts: posts.filter(post => post.generated).length, newStories: fresh.length, expired};
  } finally {
    await kv.del(lockKey).catch(error => log.warn(`Could not release refresh lock: ${(error as Error).message}`));
  }
}
