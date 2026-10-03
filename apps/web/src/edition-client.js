import { EDITION_ID_PATTERN, IMAGE_ID_PATTERN } from './shared';

/** The news service could not supply an Edition (down, empty, or not configured). */
export class EditionUnavailable extends Error {}
/** The requested Edition has been expired by the service. */
export class EditionExpired extends Error {}

const REQUEST_TIMEOUT_MS = 4_000;
const LATEST_TTL_MS = 30_000;
const MAX_CACHED_EDITIONS = 3;

/** Reads Editions from the news service, with a small per-instance cache so busy pages do not fan out. */
export function createEditionClient({baseUrl, token, fetchImpl = fetch, now = Date.now} = {}) {
  const base = baseUrl?.replace(/\/$/, '');
  const byId = new Map();
  let latest;

  const request = async path => {
    if (!base) throw new EditionUnavailable('NEWS_SERVICE_URL is not configured');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try { return await fetchImpl(`${base}${path}`, {signal: controller.signal, headers: {'Accept': 'application/json, image/*', ...(token ? {'Authorization': `Bearer ${token}`} : {})}}); }
    catch (error) { throw new EditionUnavailable(`News service unreachable: ${error.message}`); }
    finally { clearTimeout(timeout); }
  };
  const remember = edition => {
    byId.set(edition.id, edition);
    while (byId.size > MAX_CACHED_EDITIONS) byId.delete(byId.keys().next().value);
  };

  return {
    /** Latest Edition. If the service fails, the last Edition we saw is served (flagged stale). */
    async getLatest() {
      if (latest && now() - latest.at < LATEST_TTL_MS) return latest.edition;
      try {
        const response = await request('/edition');
        if (!response.ok) throw new EditionUnavailable(`News service answered ${response.status}`);
        const edition = await response.json();
        latest = {edition, at: now()};
        remember(edition);
        return edition;
      } catch (error) {
        if (latest) return {...latest.edition, stale: true};
        throw error;
      }
    },
    async get(id) {
      if (!EDITION_ID_PATTERN.test(id)) throw new EditionExpired('Invalid Edition id');
      if (byId.has(id)) return byId.get(id);
      const response = await request(`/edition/${id}`);
      if (response.status === 404) throw new EditionExpired('Edition has expired');
      if (!response.ok) throw new EditionUnavailable(`News service answered ${response.status}`);
      const edition = await response.json();
      remember(edition);
      return edition;
    },
    /** A story photo from the service, or undefined when it is gone. */
    async getImage(id) {
      if (!IMAGE_ID_PATTERN.test(id)) return undefined;
      const response = await request(`/image/${id}`);
      if (!response.ok) return undefined;
      return {contentType: response.headers.get('content-type') || 'image/jpeg', data: Buffer.from(await response.arrayBuffer())};
    },
  };
}
