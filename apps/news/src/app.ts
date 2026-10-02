import { timingSafeEqual } from 'node:crypto';
import { EDITION_ID_PATTERN, IMAGE_ID_PATTERN, type Edition } from './shared';
import type { Services } from './config';
import { readCurrentEdition, readEdition } from './editions';
import { refresh } from './refresh';

/** An Edition older than this is flagged stale: an hourly Refresh has evidently been missed. */
const STALE_AFTER_MS = 150 * 60_000;

const json = (body: unknown, status = 200, cache = 'no-store') =>
  new Response(JSON.stringify(body), {status, headers: {'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': cache}});

const authorised = (request: Request, secret: string) => {
  const given = Buffer.from(request.headers.get('authorization') ?? '');
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
};

export function createHandler(services: Services) {
  const withStale = (edition: Edition): Edition => ({...edition, stale: services.now() - edition.refreshedAt > STALE_AFTER_MS});

  return async function handle(request: Request): Promise<Response> {
    const {pathname} = new URL(request.url);
    try {
      if (pathname === '/health') return json({ok: true});

      if (pathname === '/refresh') {
        if (request.method !== 'POST') return json({error: 'Method not allowed'}, 405);
        if (!services.refreshSecret) return json({error: 'Refresh is not configured'}, 503);
        if (!authorised(request, services.refreshSecret)) return json({error: 'Unauthorized'}, 401);
        if (!services.newsEnabled) return json({error: 'News is disabled'}, 503);
        const result = await refresh(services);
        return json(result, result.status === 'busy' ? 409 : 200);
      }

      if (request.method !== 'GET' && request.method !== 'HEAD') return json({error: 'Method not allowed'}, 405);
      if (!services.newsEnabled) return json({error: 'News is disabled'}, 503);

      if (pathname === '/edition') {
        const edition = await readCurrentEdition(services.kv);
        if (!edition) return json({error: 'No Edition has been published yet'}, 503);
        return json(withStale(edition), 200, 'public, s-maxage=60, stale-while-revalidate=3600');
      }

      const editionMatch = /^\/edition\/([^/]+)$/.exec(pathname);
      if (editionMatch) {
        const id = editionMatch[1] ?? '';
        if (!EDITION_ID_PATTERN.test(id)) return json({error: 'Invalid Edition id'}, 400);
        const edition = await readEdition(services.kv, id);
        if (!edition) return json({error: 'Edition has expired'}, 404, 'public, s-maxage=60');
        return json(withStale(edition), 200, 'public, max-age=60, s-maxage=3600');
      }

      const imageMatch = /^\/image\/([^/]+)$/.exec(pathname);
      if (imageMatch) {
        const id = imageMatch[1] ?? '';
        if (!IMAGE_ID_PATTERN.test(id)) return json({error: 'Invalid image id'}, 400);
        const image = await services.images.get(id);
        if (!image) return json({error: 'Image unavailable'}, 404, 'public, s-maxage=60');
        return new Response(image.data as BodyInit, {headers: {'Content-Type': image.contentType, 'Cache-Control': 'public, max-age=31536000, immutable'}});
      }

      return json({error: 'Not found'}, 404);
    } catch (error) {
      services.log.error(`News service error: ${(error as Error).message}`);
      return json({error: 'Service error'}, 500);
    }
  };
}
