import { S3Client } from 'bun';

/** Small JSON key-value store. Implemented by Upstash in production and by memory in dev and tests. */
export interface KeyValueStore {
  get<T>(key: string): Promise<T | undefined>;
  /** Stores the value; `ttlSeconds` omitted means it never expires. Throws on failure. */
  set(key: string, value: unknown, options?: {ttlSeconds?: number}): Promise<void>;
  del(...keys: string[]): Promise<void>;
  /** Sets the key only if absent. Returns whether this caller took it. */
  setIfAbsent(key: string, ttlSeconds: number): Promise<boolean>;
}

export interface StoredImage { contentType: string; data: Uint8Array }

/** Object storage for story photos, keyed by content-hash id. */
export interface ImageStore {
  has(id: string): Promise<boolean>;
  get(id: string): Promise<StoredImage | undefined>;
  put(id: string, image: StoredImage): Promise<void>;
  delete(id: string): Promise<void>;
}

export function createMemoryKeyValueStore(now: () => number = Date.now): KeyValueStore {
  const values = new Map<string, {json: string; expiresAt?: number}>();
  const live = (key: string) => {
    const entry = values.get(key);
    if (entry?.expiresAt !== undefined && entry.expiresAt <= now()) { values.delete(key); return undefined; }
    return entry;
  };
  return {
    async get<T>(key: string) { const entry = live(key); return entry ? JSON.parse(entry.json) as T : undefined; },
    async set(key, value, {ttlSeconds} = {}) {
      values.set(key, {json: JSON.stringify(value), ...(ttlSeconds ? {expiresAt: now() + ttlSeconds * 1000} : {})});
    },
    async del(...keys) { for (const key of keys) values.delete(key); },
    async setIfAbsent(key, ttlSeconds) {
      if (live(key)) return false;
      values.set(key, {json: '1', expiresAt: now() + ttlSeconds * 1000});
      return true;
    },
  };
}

export function createMemoryImageStore(): ImageStore & {ids(): string[]} {
  const images = new Map<string, StoredImage>();
  return {
    async has(id) { return images.has(id); },
    async get(id) { return images.get(id); },
    async put(id, image) { images.set(id, image); },
    async delete(id) { images.delete(id); },
    ids: () => [...images.keys()],
  };
}

const REQUEST_TIMEOUT_MS = 5_000;

export function createUpstashKeyValueStore({url, token, fetchImpl = fetch}: {url: string; token: string; fetchImpl?: typeof fetch}): KeyValueStore {
  const endpoint = new URL(url);
  if (endpoint.protocol !== 'https:') throw new Error('UPSTASH_REDIS_REST_URL must use https');
  const command = async (parts: (string | number)[]) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const response = await fetchImpl(endpoint.href.replace(/\/$/, ''), {
        method: 'POST', signal: controller.signal,
        headers: {'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json', 'User-Agent': 'LarpedIn/0.1'},
        body: JSON.stringify(parts),
      });
      if (!response.ok) throw new Error(`Redis request failed (${response.status})`);
      const payload = await response.json() as {result?: unknown; error?: string};
      if (payload.error) throw new Error(`Redis command failed: ${payload.error}`);
      return payload.result;
    } finally { clearTimeout(timeout); }
  };
  return {
    async get<T>(key: string) {
      const value = await command(['GET', key]);
      return typeof value === 'string' ? JSON.parse(value) as T : undefined;
    },
    async set(key, value, {ttlSeconds} = {}) {
      await command(ttlSeconds ? ['SET', key, JSON.stringify(value), 'EX', ttlSeconds] : ['SET', key, JSON.stringify(value)]);
    },
    async del(...keys) { if (keys.length) await command(['DEL', ...keys]); },
    async setIfAbsent(key, ttlSeconds) { return (await command(['SET', key, '1', 'NX', 'EX', ttlSeconds])) === 'OK'; },
  };
}

export function createR2ImageStore({accountId, accessKeyId, secretAccessKey, bucket}: {accountId: string; accessKeyId: string; secretAccessKey: string; bucket: string}): ImageStore {
  const client = new S3Client({accessKeyId, secretAccessKey, bucket, endpoint: `https://${accountId}.r2.cloudflarestorage.com`});
  const key = (id: string) => `news-images/${id}`;
  return {
    async has(id) { return client.exists(key(id)); },
    async get(id) {
      const file = client.file(key(id));
      if (!(await file.exists())) return undefined;
      return {contentType: file.type || 'image/jpeg', data: new Uint8Array(await file.arrayBuffer())};
    },
    async put(id, image) { await client.write(key(id), image.data, {type: image.contentType}); },
    async delete(id) { await client.delete(key(id)); },
  };
}
