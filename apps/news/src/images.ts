import { IMAGE_ID_PATTERN } from './shared';
import { extractTechCrunchImage, MAX_ARTICLE_BYTES } from './rss';
import type { ImageStore } from './stores';
import { imageIdFor } from './posts';
import type { Story } from './types';

const MAX_IMAGE_BYTES = 3_000_000;
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];

interface ImageDeps { images: ImageStore; fetchImpl: typeof fetch; log: Pick<Console, 'warn'> }

async function fetchWithTimeout(fetchImpl: typeof fetch, url: string, ms: number, headers: Record<string, string>) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ms);
  try { return await fetchImpl(url, {signal: controller.signal, headers}); }
  finally { clearTimeout(timeout); }
}

/** Makes sure the story's photo is in the image store. Returns its id, or undefined when it has none. */
export async function ensureStoryImage(story: Story, {images, fetchImpl, log}: ImageDeps): Promise<{id: string} | undefined> {
  const id = imageIdFor(story);
  if (!IMAGE_ID_PATTERN.test(id)) return undefined;
  try {
    if (await images.has(id)) return {id};
    const article = await fetchWithTimeout(fetchImpl, story.url, 8_000, {'User-Agent': 'LarpedIn/0.1 image metadata', 'Accept': 'text/html'});
    if (!article.ok) throw new Error(`article request failed (${article.status})`);
    if (Number(article.headers.get('content-length')) > MAX_ARTICLE_BYTES) throw new Error('article response was too large');
    const imageUrl = extractTechCrunchImage(await article.text());
    if (!imageUrl) return undefined;

    const response = await fetchWithTimeout(fetchImpl, imageUrl, 12_000, {'User-Agent': 'LarpedIn/0.1 image cache', 'Accept': 'image/avif,image/webp,image/jpeg,image/png'});
    if (!response.ok) throw new Error(`image request failed (${response.status})`);
    const contentType = response.headers.get('content-type')?.split(';')[0]?.toLowerCase() ?? '';
    if (!IMAGE_TYPES.includes(contentType) || Number(response.headers.get('content-length')) > MAX_IMAGE_BYTES) throw new Error('image response was invalid');
    const data = new Uint8Array(await response.arrayBuffer());
    if (!data.length || data.length > MAX_IMAGE_BYTES) throw new Error('image response was too large');
    await images.put(id, {contentType, data});
    return {id};
  } catch (error) {
    log.warn(`News image unavailable: ${(error as Error).message}`);
    return undefined;
  }
}
