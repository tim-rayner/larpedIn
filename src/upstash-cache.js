const DEFAULT_TTL_SECONDS = 60 * 60;
const REQUEST_TIMEOUT_MS = 5_000;

const configuredEndpoint = env => {
  const url = env.UPSTASH_REDIS_REST_URL?.trim();
  const token = env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (!url || !token) return undefined;
  try {
    const endpoint = new URL(url);
    if (endpoint.protocol !== 'https:') return undefined;
    return {url:endpoint.href.replace(/\/$/, ''),token};
  } catch { return undefined; }
};

export function createUpstashCache({env = process.env, fetchImpl = fetch, log = console, ttlSeconds = DEFAULT_TTL_SECONDS} = {}) {
  const endpoint = configuredEndpoint(env);
  if (!endpoint) return undefined;

  const command = async parts => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const response = await fetchImpl(endpoint.url, {
        method:'POST',
        signal:controller.signal,
        headers:{
          'Authorization':`Bearer ${endpoint.token}`,
          'Content-Type':'application/json',
          'User-Agent':'LarpedIn/0.1',
        },
        body:JSON.stringify(parts),
      });
      if (!response.ok) throw new Error(`Redis request failed (${response.status})`);
      const payload = await response.json();
      if (payload.error) throw new Error(`Redis command failed: ${payload.error}`);
      return payload.result;
    } finally { clearTimeout(timeout); }
  };

  return {
    ttlSeconds,
    async get(key) {
      try {
        const value = await command(['GET',key]);
        return typeof value === 'string' ? JSON.parse(value) : undefined;
      } catch (error) {
        log.warn?.(`Shared news cache read unavailable: ${error.message}`);
        return undefined;
      }
    },
    async set(key, value) {
      try {
        await command(['SET',key,JSON.stringify(value),'EX',ttlSeconds]);
        return true;
      } catch (error) {
        log.warn?.(`Shared news cache write unavailable: ${error.message}`);
        return false;
      }
    },
  };
}

export const NEWS_CACHE_TTL_SECONDS = DEFAULT_TTL_SECONDS;
