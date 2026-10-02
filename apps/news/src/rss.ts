import type { Story } from './types.ts';

export const TECHCRUNCH_FEED_URL = 'https://techcrunch.com/feed/';
export const MAX_FEED_BYTES = 2_000_000;
export const MAX_ARTICLE_BYTES = 3_000_000;
const DEFAULT_MAX_ITEMS = 36;

const entities: Record<string, string> = Object.freeze({amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:' ',8216:'‘',8217:'’',8220:'“',8221:'”',8211:'–',8212:'—',8230:'…'});
export function decodeXml(value = ''): string {
  return value.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/&#(x?[0-9a-f]+);|&([a-z]+);/gi, (match, numeric?: string, named?: string) => {
    if (numeric) {
      const code = Number.parseInt(numeric.replace(/^x/i, ''), /^x/i.test(numeric) ? 16 : 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : match;
    }
    return entities[(named ?? '').toLowerCase()] ?? match;
  });
}
const plainText = (value: string) => decodeXml(value).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
const tag = (xml: string, name: string) => xml.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`, 'i'))?.[1] ?? '';
const tags = (xml: string, name: string) => [...xml.matchAll(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`, 'gi'))].map(match => plainText(match[1] ?? '')).filter(Boolean);
const isTechCrunchHost = (hostname: string) => hostname === 'techcrunch.com' || hostname.endsWith('.techcrunch.com');

export const safeTechCrunchUrl = (value: string): string | undefined => {
  try {
    const url = new URL(plainText(value));
    return url.protocol === 'https:' && isTechCrunchHost(url.hostname) ? url.href : undefined;
  } catch { return undefined; }
};
export const safeTechCrunchImageUrl = (value: string): string | undefined => {
  try {
    const url = new URL(decodeXml(value));
    if (url.protocol !== 'https:' || !isTechCrunchHost(url.hostname) || !url.pathname.startsWith('/wp-content/uploads/')) return undefined;
    url.searchParams.set('resize', '900,600');
    return url.href;
  } catch { return undefined; }
};
const attribute = (element: string, name: string) => element.match(new RegExp(`\\b${name}\\s*=\\s*(["'])(.*?)\\1`, 'i'))?.[2];

export function extractTechCrunchImage(html = ''): string | undefined {
  if (typeof html !== 'string' || html.length > MAX_ARTICLE_BYTES) return undefined;
  for (const match of html.matchAll(/<meta\s+[^>]*>/gi)) {
    const property = attribute(match[0], 'property') || attribute(match[0], 'name');
    if (!/^og:image(?::secure_url)?$/i.test(property || '')) continue;
    const image = safeTechCrunchImageUrl(attribute(match[0], 'content') ?? '');
    if (image) return image;
  }
  return undefined;
}

export function parseTechCrunchRss(xml: string, limit = DEFAULT_MAX_ITEMS): Story[] {
  if (typeof xml !== 'string' || xml.length > MAX_FEED_BYTES) throw new Error('Unexpected RSS response size');
  const stories: Story[] = [];
  for (const match of [...xml.matchAll(/<item(?:\s[^>]*)?>([\s\S]*?)<\/item>/gi)].slice(0, limit)) {
    const item = match[1] ?? '';
    const url = safeTechCrunchUrl(tag(item, 'link'));
    const published = new Date(plainText(tag(item, 'pubDate')));
    const title = plainText(tag(item, 'title')).slice(0, 300);
    if (!title || !url) continue;
    stories.push({
      title,
      description: plainText(tag(item, 'description')).slice(0, 800),
      author: plainText(tag(item, 'dc:creator')).slice(0, 100),
      categories: tags(item, 'category').slice(0, 12),
      url,
      ...(Number.isNaN(published.getTime()) ? {} : {publishedAt: published.toISOString()}),
    });
  }
  return stories;
}
