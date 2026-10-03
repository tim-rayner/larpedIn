import type { Services } from '../src/config';
import { createMemoryImageStore, createMemoryKeyValueStore } from '../src/stores';

export const rss = (count: number, prefix = 'Story') => `<?xml version="1.0"?><rss><channel>${Array.from({length: count}, (_, index) =>
  `<item><title>${prefix} ${index + 1}</title><link>https://techcrunch.com/2026/10/01/${prefix.toLowerCase()}-${index + 1}/</link><dc:creator>Reporter</dc:creator><pubDate>Thu, 01 Oct 2026 12:00:00 +0000</pubDate><category>AI</category><description>Summary ${index + 1}.</description></item>`).join('')}</channel></rss>`;

export const quietLog = {warn() {}, error() {}, log() {}};

export interface Harness { services: Services; calls: {openai: number; articles: number; photos: number; rss: number}; images: ReturnType<typeof createMemoryImageStore>; clock: {now: number} }

/** Services wired to fakes: RSS from `feed()`, every article exposing a photo, OpenAI optional. */
export function harness({feed = () => rss(3), openai = true, secret = 'test-secret', readToken = null}: {feed?: () => string; openai?: boolean; secret?: string | null; readToken?: string | null} = {}): Harness {
  const calls = {openai: 0, articles: 0, photos: 0, rss: 0};
  const images = createMemoryImageStore();
  const clock = {now: Date.parse('2026-10-02T00:00:00Z')};
  const fetchImpl = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input);
    if (url === 'https://techcrunch.com/feed/') { calls.rss++; return new Response(feed(), {status: 200}); }
    if (url === 'https://api.openai.com/v1/responses') {
      calls.openai++;
      const assignments = JSON.parse(JSON.parse(String(init?.body)).input) as {id: string; template: {id: string}; source: {title: string}}[];
      const posts = assignments.map(item => ({id: item.id, templateId: item.template.id, commentary: [`Opinion on ${item.source.title}.`], hashtags: '#TechNews #Satire', category: 'Tech gospel'}));
      return new Response(JSON.stringify({output: [{content: [{type: 'output_text', text: JSON.stringify({posts})}]}]}), {status: 200});
    }
    if (url.startsWith('https://techcrunch.com/wp-content/uploads/')) { calls.photos++; return new Response(new Uint8Array([1, 2, 3]), {status: 200, headers: {'content-type': 'image/jpeg'}}); }
    if (url.startsWith('https://techcrunch.com/')) { calls.articles++; return new Response(`<meta property="og:image" content="https://techcrunch.com/wp-content/uploads/2026/10/${url.split('/').filter(Boolean).pop()}.jpg">`, {status: 200}); }
    throw new Error(`Unexpected request: ${url}`);
  }) as typeof fetch;
  const services: Services = {
    kv: createMemoryKeyValueStore(() => clock.now), images, fetchImpl, now: () => clock.now, random: () => 0, log: quietLog,
    feedUrl: 'https://techcrunch.com/feed/', maxItems: 36, ...(openai ? {openaiApiKey: 'test-key'} : {}), openaiModel: 'test-model',
    ...(secret ? {refreshSecret: secret} : {}), ...(readToken ? {readToken} : {}), newsEnabled: true,
  };
  return {services, calls, images, clock};
}
