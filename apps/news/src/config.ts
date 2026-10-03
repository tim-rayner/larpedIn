import { TECHCRUNCH_FEED_URL } from './rss';
import { DEFAULT_MODEL } from './satire';
import { createMemoryImageStore, createMemoryKeyValueStore, createR2ImageStore, createUpstashKeyValueStore, type ImageStore, type KeyValueStore } from './stores';

export interface Services {
  kv: KeyValueStore;
  images: ImageStore;
  fetchImpl: typeof fetch;
  now: () => number;
  random: () => number;
  log: Pick<Console, 'warn' | 'error' | 'log'>;
  feedUrl: string;
  maxItems: number;
  openaiApiKey?: string;
  openaiModel: string;
  refreshSecret?: string;
  /** Bearer token the web app must present to read Editions and images. Unset = reads are open (dev only). */
  readToken?: string;
  newsEnabled: boolean;
}

const clamp = (value: string | undefined, fallback: number, max: number) => Math.min(max, Math.max(1, Number.parseInt(value ?? '', 10) || fallback));

/** Builds production services from the environment; falls back to in-memory stores for local dev. */
export function servicesFromEnv(env: Record<string, string | undefined> = process.env, log: Services['log'] = console): Services {
  const upstashUrl = env.UPSTASH_REDIS_REST_URL?.trim();
  const upstashToken = env.UPSTASH_REDIS_REST_TOKEN?.trim();
  const r2Names = ['R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET'] as const;
  const [accountId, accessKeyId, secretAccessKey, bucket] = r2Names.map(name => env[name]?.trim());
  const missingR2 = r2Names.filter(name => !env[name]?.trim());
  const kv = upstashUrl && upstashToken ? createUpstashKeyValueStore({url: upstashUrl, token: upstashToken}) : createMemoryKeyValueStore();
  const images = accountId && accessKeyId && secretAccessKey && bucket ? createR2ImageStore({accountId, accessKeyId, secretAccessKey, bucket}) : createMemoryImageStore();
  if (!(upstashUrl && upstashToken)) log.warn('UPSTASH_REDIS_REST_URL/TOKEN not set: using in-memory edition store (dev only).');
  if (!(accountId && accessKeyId && secretAccessKey && bucket)) log.warn(`${missingR2.join(', ')} not set: using in-memory image store (dev only).`);
  if (!env.NEWS_SERVICE_TOKEN) log.warn('NEWS_SERVICE_TOKEN not set: Edition and image routes are open to anyone (dev only).');
  return {
    kv, images, fetchImpl: fetch, now: Date.now, random: Math.random, log,
    feedUrl: env.TECH_NEWS_RSS_URL || TECHCRUNCH_FEED_URL,
    maxItems: clamp(env.TECH_NEWS_MAX_ITEMS, 36, 50),
    ...(env.OPENAI_API_KEY ? {openaiApiKey: env.OPENAI_API_KEY} : {}),
    openaiModel: env.OPENAI_MODEL || DEFAULT_MODEL,
    ...(env.REFRESH_SECRET ? {refreshSecret: env.REFRESH_SECRET} : {}),
    ...(env.NEWS_SERVICE_TOKEN ? {readToken: env.NEWS_SERVICE_TOKEN} : {}),
    newsEnabled: env.TECH_NEWS_ENABLED !== 'false',
  };
}
