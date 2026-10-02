import { EDITION_ID_PATTERN, type Edition } from '@larpedin/shared';
import type { ImageStore, KeyValueStore } from './stores.ts';

const PREFIX = 'larpedin:v1';
const currentKey = `${PREFIX}:current`;
const indexKey = `${PREFIX}:index`;
const editionKey = (id: string) => `${PREFIX}:edition:${id}`;
export const lockKey = `${PREFIX}:refresh-lock`;

/** Editions kept after a Refresh: the new one plus the one readers may still be paging through. */
const RETAINED_EDITIONS = 2;

export const imageIdsOf = (edition: Edition): string[] =>
  edition.posts.flatMap(post => {
    const id = post.image?.split('/').pop();
    return id ? [id] : [];
  });

export async function readCurrentEdition(kv: KeyValueStore): Promise<Edition | undefined> {
  const id = await kv.get<string>(currentKey);
  return id ? readEdition(kv, id) : undefined;
}

export async function readEdition(kv: KeyValueStore, id: string): Promise<Edition | undefined> {
  if (!EDITION_ID_PATTERN.test(id)) return undefined;
  return kv.get<Edition>(editionKey(id));
}

/**
 * Makes `edition` the current one, then expires older Editions and the images only they used.
 * Nothing is deleted before the new Edition is live, so a failed Refresh never leaves readers empty.
 */
export async function publishEdition(kv: KeyValueStore, images: ImageStore, edition: Edition): Promise<{expired: string[]}> {
  const previousIndex = (await kv.get<string[]>(indexKey)) ?? [];
  await kv.set(editionKey(edition.id), edition);
  const index = [edition.id, ...previousIndex.filter(id => id !== edition.id)];
  const kept = index.slice(0, RETAINED_EDITIONS);
  const dropped = index.slice(RETAINED_EDITIONS);
  await kv.set(indexKey, kept);
  await kv.set(currentKey, edition.id);

  if (!dropped.length) return {expired: []};
  const stillUsed = new Set<string>();
  for (const id of kept) {
    const keptEdition = id === edition.id ? edition : await readEdition(kv, id);
    if (keptEdition) imageIdsOf(keptEdition).forEach(imageId => stillUsed.add(imageId));
  }
  const orphaned = new Set<string>();
  for (const id of dropped) {
    const old = await readEdition(kv, id);
    if (old) imageIdsOf(old).filter(imageId => !stillUsed.has(imageId)).forEach(imageId => orphaned.add(imageId));
  }
  await Promise.all([...orphaned].map(imageId => images.delete(imageId)));
  await kv.del(...dropped.map(editionKey));
  return {expired: dropped};
}
