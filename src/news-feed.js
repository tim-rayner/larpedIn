import { createHash } from 'node:crypto';
import { characterForNewsStory } from './characters.js';
import { createUpstashCache, NEWS_CACHE_TTL_SECONDS } from './upstash-cache.js';
import { chooseSatireTemplates } from './satire-templates.js';

export const TECHCRUNCH_FEED_URL = 'https://techcrunch.com/feed/';
const OPENAI_RESPONSES_URL = 'https://api.openai.com/v1/responses';
const DEFAULT_MODEL = 'gpt-6-luna';
const MAX_FEED_BYTES = 2_000_000;
const MAX_ARTICLE_BYTES = 3_000_000;
const MAX_IMAGE_BYTES = 3_000_000;
const DEFAULT_PAGE_SIZE = 6;
const DEFAULT_MAX_ITEMS = 36;
const CACHE_MS = NEWS_CACHE_TTL_SECONDS * 1000;
const CACHE_VERSION = 'v8';

const entities = Object.freeze({amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:' ',8216:'‘',8217:'’',8220:'“',8221:'”',8211:'–',8212:'—',8230:'…'});
export function decodeXml(value = '') {
  return value.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/&#(x?[0-9a-f]+);|&([a-z]+);/gi, (match, numeric, named) => {
    if (numeric) {
      const code = Number.parseInt(numeric.replace(/^x/i, ''), /^x/i.test(numeric) ? 16 : 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : match;
    }
    return entities[named.toLowerCase()] ?? match;
  });
}
const plainText = value => decodeXml(value).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
const tag = (xml, name) => xml.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`, 'i'))?.[1] || '';
const tags = (xml, name) => [...xml.matchAll(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`, 'gi'))].map(match => plainText(match[1])).filter(Boolean);
const safeTechCrunchUrl = value => {
  try {
    const url = new URL(plainText(value));
    return url.protocol === 'https:' && (url.hostname === 'techcrunch.com' || url.hostname.endsWith('.techcrunch.com')) ? url.href : undefined;
  } catch { return undefined; }
};
const safeTechCrunchImageUrl = value => {
  try {
    const url = new URL(decodeXml(value));
    const hostAllowed = url.hostname === 'techcrunch.com' || url.hostname.endsWith('.techcrunch.com');
    if (url.protocol !== 'https:' || !hostAllowed || !url.pathname.startsWith('/wp-content/uploads/')) return undefined;
    url.searchParams.set('resize','900,600');
    return url.href;
  } catch { return undefined; }
};
const attribute = (element, name) => element.match(new RegExp(`\\b${name}\\s*=\\s*(["'])(.*?)\\1`,'i'))?.[2];
export function extractTechCrunchImage(html = '') {
  if (typeof html !== 'string' || html.length > MAX_ARTICLE_BYTES) return undefined;
  for (const match of html.matchAll(/<meta\s+[^>]*>/gi)) {
    const property = attribute(match[0],'property') || attribute(match[0],'name');
    if (!/^og:image(?::secure_url)?$/i.test(property || '')) continue;
    const image = safeTechCrunchImageUrl(attribute(match[0],'content'));
    if (image) return image;
  }
  return undefined;
}

export function parseTechCrunchRss(xml, limit = DEFAULT_MAX_ITEMS) {
  if (typeof xml !== 'string' || xml.length > MAX_FEED_BYTES) throw new Error('Unexpected RSS response size');
  return [...xml.matchAll(/<item(?:\s[^>]*)?>([\s\S]*?)<\/item>/gi)].slice(0, limit).map(match => {
    const item = match[1];
    const url = safeTechCrunchUrl(tag(item, 'link'));
    const publishedAt = new Date(plainText(tag(item, 'pubDate')));
    return {
      title: plainText(tag(item, 'title')).slice(0, 300),
      description: plainText(tag(item, 'description')).slice(0, 800),
      author: plainText(tag(item, 'dc:creator')).slice(0, 100),
      categories: tags(item, 'category').slice(0, 12),
      url,
      publishedAt: Number.isNaN(publishedAt.getTime()) ? undefined : publishedAt.toISOString(),
    };
  }).filter(item => item.title && item.url);
}

const stableNumber = (value, min, spread) => min + Number.parseInt(createHash('sha256').update(value).digest('hex').slice(0, 8), 16) % spread;
const relativeTime = (publishedAt, now) => {
  if (!publishedAt) return 'Recently';
  const minutes = Math.max(1, Math.floor((now - new Date(publishedAt).getTime()) / 60_000));
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  return hours < 24 ? `${hours}h` : `${Math.floor(hours / 24)}d`;
};
const fallbackClosers = Object.freeze({
  'scam-altman':'At ClosedAI, we believe every news cycle is one API wrapper away from becoming a platform.',
  'elong-husk':'Teslol expects to solve this with a software update, an ambitious timeline and absolutely no follow-up questions.',
  'mark-zuckerbot':'MehTa is studying how this development might help people connect more authentically with targeted advertising.',
  'satire-nadella':'Macrosoft has added this to the roadmap, the cloud, and a licensing tier nobody remembers approving.',
  'jensen-hype':'NVIDIYAY has reviewed the situation and concluded that it would improve significantly with more compute.',
  'sundar-pitchai':'Gaggle has launched three internal projects about this. Two may still exist by the end of this sentence.',
});
const sourceLead = story => story.description || story.title;
const fallbackCopy = (story, character) => ({
  body: [sourceLead(story), fallbackClosers[character.characterId]],
  tags: '#TechNews #ThoughtLeadership',
  tag: story.categories.some(c => /ai/i.test(c)) ? 'AI & hot takes' : 'Tech gospel',
});

function toPost(story, generated, now, image) {
  const character = characterForNewsStory(story);
  const id = `rss-${createHash('sha256').update(story.url).digest('hex').slice(0, 14)}`;
  const copy = generated ? {...generated,body:[sourceLead(story),...generated.commentary]} : fallbackCopy(story, character);
  return {
    id, ...character, time: relativeTime(story.publishedAt, now), tag: copy.tag,
    social: story.author || 'News desk',
    body: copy.body, tags: copy.tags, sourceUrl: story.url, sourceName: 'TechCrunch',
    image:image ? `/api/news-image/${image.id}` : undefined,
    imageAlt:image ? `Photo for: ${story.title}` : undefined,
    likes: stableNumber(`${story.url}:likes`, 120, 2100),
    comments: stableNumber(`${story.url}:comments`, 12, 230),
    reposts: stableNumber(`${story.url}:reposts`, 4, 70),
  };
}

const outputText = response => response.output?.flatMap(item => item.content || []).find(content => content.type === 'output_text')?.text;
async function generateSatire(stories, templates, {apiKey, model, fetchImpl}) {
  if (!apiKey) return undefined;
  if (stories.length > 3) {
    const batches=[];
    for(let index=0;index<stories.length;index+=3)batches.push(generateSatire(stories.slice(index,index+3),templates.slice(index,index+3),{apiKey,model,fetchImpl}));
    return (await Promise.all(batches)).flat();
  }
  const assignments = stories.map((story, index) => {
    const character = characterForNewsStory(story);
    return {
      id:String(index),
      character:{name:character.name,company:character.company,role:character.role},
      source:{title:story.title,summary:story.description,author:story.author,categories:story.categories,publishedAt:story.publishedAt},
      template:templates[index],
    };
  });
  const schema = {
    type:'object', additionalProperties:false, required:['posts'],
    properties:{posts:{
      type:'array', minItems:stories.length, maxItems:stories.length,
      items:{
        type:'object', additionalProperties:false, required:['id','templateId','commentary','hashtags','category'],
        properties:{
          id:{type:'string'},
          templateId:{type:'string'},
          commentary:{type:'array',minItems:1,maxItems:3,items:{type:'string',minLength:1,maxLength:420}},
          hashtags:{type:'string',minLength:3,maxLength:120},
          category:{type:'string',enum:['AI & hot takes','Tech gospel','The founder life']},
        },
      },
    }},
  };
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25_000);
  try {
    const response = await fetchImpl(OPENAI_RESPONSES_URL, {
      method:'POST', signal:controller.signal,
      headers:{'Authorization':`Bearer ${apiKey}`,'Content-Type':'application/json'},
      body:JSON.stringify({
        model, store:false, reasoning:{effort:'none'}, max_output_tokens:1800,
        instructions:'You write concise, playful professional-network satire using only the supplied source metadata. The application adds the source summary as a factual first paragraph, so write only 1-3 short reaction paragraphs. Follow each assigned template and return its exact template id. Every factual assertion must be directly supported by the supplied title or summary. Never invent or embellish events, quotes, numbers, motives, causation, allegations, customers, employees, company actions, or private information. Clearly frame inference, prediction, and interpretation as the fictional author’s opinion using words such as “I think”, “might”, or “could”. The named author and company are fictional parody characters. Do not impersonate or quote a real person. Do not include a link; the application adds it. Use 2-4 relevant hashtags. Avoid cruelty, harassment, political persuasion, and jokes about protected traits.',
        input:JSON.stringify(assignments),
        text:{format:{type:'json_schema',name:'satire_posts',strict:true,schema}},
      }),
    });
    if (!response.ok) throw new Error(`OpenAI request failed (${response.status})`);
    const payload = await response.json();
    const text = outputText(payload);
    if (!text) throw new Error('OpenAI returned no text');
    const parsed = JSON.parse(text);
    const byId = new Map(parsed.posts.map(post => [post.id, post]));
    const categories=new Set(['AI & hot takes','Tech gospel','The founder life']);
    return stories.map((story, index) => {
      const post=byId.get(String(index));
      const commentaryValid=Array.isArray(post?.commentary)&&post.commentary.length>=1&&post.commentary.length<=3&&post.commentary.every(paragraph=>typeof paragraph==='string'&&paragraph.trim()&&paragraph.length<=420&&!/^(?:tags?|hashtags?|AI & hot takes|Tech gospel|The founder life)$/i.test(paragraph.trim()));
      const hashtagsValid=typeof post?.hashtags==='string'&&/^#[A-Za-z0-9_]+(?: #[A-Za-z0-9_]+){1,3}$/.test(post.hashtags);
      if(post?.templateId!==templates[index].id||!commentaryValid||!hashtagsValid||!categories.has(post.category))return undefined;
      return {commentary:post.commentary.map(paragraph=>paragraph.trim()),tags:post.hashtags,tag:post.category};
    });
  } finally { clearTimeout(timeout); }
}

const clampInteger = (value, fallback, max) => Math.min(max, Math.max(1, Number.parseInt(value, 10) || fallback));
const makeCursor = (snapshotId, offset) => `${snapshotId}.${offset}`;
const readCursor = cursor => {
  if (cursor === undefined) return undefined;
  const match = /^([a-f0-9]{16})\.([1-9][0-9]{0,3})$/.exec(cursor);
  if (!match) throw new FeedCursorError('Invalid feed cursor');
  return {snapshotId:match[1],offset:Number(match[2])};
};
export class FeedCursorError extends Error {}

export function createNewsFeedService({fetchImpl = fetch, env = process.env, now = () => Date.now(), log = console, sharedCache, random = Math.random} = {}) {
  const snapshots = new Map();
  const imageMetadata = new Map();
  const images = new Map();
  let currentSnapshot;
  let refreshInFlight;
  const pageSize = clampInteger(env.TECH_NEWS_PAGE_SIZE || env.TECH_NEWS_ITEM_LIMIT, DEFAULT_PAGE_SIZE, 10);
  const maxItems = clampInteger(env.TECH_NEWS_MAX_ITEMS, DEFAULT_MAX_ITEMS, 50);
  const feedUrl = env.TECH_NEWS_RSS_URL || TECHCRUNCH_FEED_URL;
  const cache = sharedCache === undefined ? createUpstashCache({env,fetchImpl,log}) : sharedCache;
  const sourceKey = createHash('sha256').update(`${feedUrl}|${maxItems}`).digest('hex').slice(0,12);
  const pageVariant = createHash('sha256').update(`${pageSize}|${env.OPENAI_API_KEY ? env.OPENAI_MODEL || DEFAULT_MODEL : 'fallback'}`).digest('hex').slice(0,12);
  const key = suffix => `larpedin:news:${CACHE_VERSION}:${sourceKey}:${suffix}`;
  const currentKey = key('current');
  const snapshotKey = id => key(`snapshot:${id}`);
  const pageKey = (id,offset) => key(`page:${id}:${pageVariant}:${offset}`);
  const imageMetaKey = id => key(`image-meta:${id}`);
  const imageDataKey = id => key(`image-data:${id}`);
  const validStories = stories => Array.isArray(stories) && stories.length > 0 && stories.length <= maxItems && stories.every(story => story && typeof story.title === 'string' && typeof story.url === 'string' && safeTechCrunchUrl(story.url) === story.url);
  const hydrateSnapshot = value => {
    if (!value || !/^[a-f0-9]{16}$/.test(value.id) || !validStories(value.stories) || !Number.isFinite(value.refreshedAt)) return undefined;
    if (value.refreshedAt > now() + 60_000 || now() - value.refreshedAt >= CACHE_MS) return undefined;
    const existing = snapshots.get(value.id);
    const snapshot = existing || {id:value.id,stories:value.stories,refreshedAt:value.refreshedAt,pages:new Map(),stale:false};
    snapshot.stories=value.stories;snapshot.refreshedAt=value.refreshedAt;snapshot.stale=false;
    snapshots.set(snapshot.id,snapshot);
    while(snapshots.size>2)snapshots.delete(snapshots.keys().next().value);
    return snapshot;
  };
  const saveSnapshot = async snapshot => {
    if (!cache) return;
    const value={id:snapshot.id,stories:snapshot.stories,refreshedAt:snapshot.refreshedAt};
    await Promise.all([cache.set(currentKey,value),cache.set(snapshotKey(snapshot.id),value)]);
  };
  const refresh = async () => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12_000);
    let response;
    try {
      response = await fetchImpl(feedUrl, {signal:controller.signal,headers:{'User-Agent':'LarpedIn/0.1 RSS reader'}});
    } finally { clearTimeout(timeout); }
    if (!response.ok) throw new Error(`RSS request failed (${response.status})`);
    const xml = await response.text();
    const stories = parseTechCrunchRss(xml, maxItems);
    if (!stories.length) throw new Error('RSS feed contained no usable stories');
    const refreshedAt = now();
    const id = createHash('sha256').update(stories.map(story => story.url).join('\n')).digest('hex').slice(0, 16);
    const existing = snapshots.get(id);
    currentSnapshot = existing || {id,stories,refreshedAt,pages:new Map(),stale:false};
    currentSnapshot.stories=stories;currentSnapshot.refreshedAt=refreshedAt;currentSnapshot.stale=false;
    snapshots.set(id,currentSnapshot);
    while(snapshots.size>2)snapshots.delete(snapshots.keys().next().value);
    await saveSnapshot(currentSnapshot);
    return currentSnapshot;
  };
  const getCurrentSnapshot = async () => {
    if (currentSnapshot && now() - currentSnapshot.refreshedAt < CACHE_MS) return currentSnapshot;
    if (!refreshInFlight) refreshInFlight = (async()=>{
      const shared=hydrateSnapshot(await cache?.get(currentKey));
      if (shared) {currentSnapshot=shared;return shared;}
      return refresh();
    })().catch(error => {
      if (currentSnapshot) {currentSnapshot.stale=true;return currentSnapshot;}
      throw error;
    }).finally(() => {refreshInFlight=undefined;});
    return refreshInFlight;
  };
  const imageIdFor = story => createHash('sha256').update(story.url).digest('hex').slice(0,20);
  const validImageMetadata = value => value && /^[a-f0-9]{20}$/.test(value.id) && safeTechCrunchImageUrl(value.url) === value.url;
  const resolveStoryImage = story => {
    const id=imageIdFor(story);
    if (imageMetadata.has(id)) return imageMetadata.get(id);
    const pending=(async()=>{
      const cached=await cache?.get(imageMetaKey(id));
      if (validImageMetadata(cached)) return cached;
      const controller=new AbortController();
      const timeout=setTimeout(()=>controller.abort(),8_000);
      try {
        const response=await fetchImpl(story.url,{signal:controller.signal,headers:{'User-Agent':'LarpedIn/0.1 image metadata','Accept':'text/html'}});
        if (!response.ok) throw new Error(`article request failed (${response.status})`);
        const declared=Number(response.headers.get('content-length'));
        if (declared > MAX_ARTICLE_BYTES) throw new Error('article response was too large');
        const html=await response.text();
        const url=extractTechCrunchImage(html);
        if (!url) return undefined;
        const metadata={id,url};
        await cache?.set(imageMetaKey(id),metadata);
        return metadata;
      } catch(error) {
        log.warn?.(`News image metadata unavailable: ${error.message}`);
        return undefined;
      } finally {clearTimeout(timeout);}
    })().then(value=>{if(!value)imageMetadata.delete(id);return value;});
    imageMetadata.set(id,pending);
    return pending;
  };
  const validCachedImage = value => value && ['image/jpeg','image/png','image/webp','image/avif'].includes(value.contentType) && typeof value.data === 'string' && value.data.length <= MAX_IMAGE_BYTES * 1.5;
  const loadImage = id => {
    if (images.has(id)) return images.get(id);
    const pending=(async()=>{
      const cached=await cache?.get(imageDataKey(id));
      if (validCachedImage(cached)) return {contentType:cached.contentType,data:Buffer.from(cached.data,'base64')};
      const metadata=imageMetadata.get(id) ? await imageMetadata.get(id) : await cache?.get(imageMetaKey(id));
      if (!validImageMetadata(metadata)) return undefined;
      const controller=new AbortController();
      const timeout=setTimeout(()=>controller.abort(),12_000);
      try {
        const response=await fetchImpl(metadata.url,{signal:controller.signal,headers:{'User-Agent':'LarpedIn/0.1 image cache','Accept':'image/avif,image/webp,image/jpeg,image/png'}});
        if (!response.ok) throw new Error(`image request failed (${response.status})`);
        const contentType=response.headers.get('content-type')?.split(';')[0].toLowerCase();
        const declared=Number(response.headers.get('content-length'));
        if (!['image/jpeg','image/png','image/webp','image/avif'].includes(contentType) || declared > MAX_IMAGE_BYTES) throw new Error('image response was invalid');
        const data=Buffer.from(await response.arrayBuffer());
        if (!data.length || data.length > MAX_IMAGE_BYTES) throw new Error('image response was too large');
        await cache?.set(imageDataKey(id),{contentType,data:data.toString('base64')});
        return {contentType,data};
      } catch(error) {
        log.warn?.(`News image unavailable: ${error.message}`);
        return undefined;
      } finally {clearTimeout(timeout);}
    })().then(value=>{if(!value)images.delete(id);return value;});
    images.set(id,pending);
    return pending;
  };
  const buildPage = async (snapshot, offset) => {
    const stories = snapshot.stories.slice(offset, offset + pageSize);
    if (!stories.length) throw new FeedCursorError('Feed cursor is beyond the available stories');
    const cached = await cache?.get(pageKey(snapshot.id,offset));
    if (cached && Array.isArray(cached.posts) && cached.posts.length === stories.length && cached.offset === offset && cached.posts.every(post => post && typeof post.id === 'string' && typeof post.sourceUrl === 'string' && safeTechCrunchUrl(post.sourceUrl) === post.sourceUrl)) {
      return {...cached,stale:snapshot.stale};
    }
    const templates=chooseSatireTemplates(stories.length,random);
    const generation=generateSatire(stories,templates,{apiKey:env.OPENAI_API_KEY,model:env.OPENAI_MODEL || DEFAULT_MODEL,fetchImpl}).catch(error=>{log.warn?.(`Satire generation unavailable: ${error.message}`);return undefined;});
    const [generated,storyImages]=await Promise.all([generation,Promise.all(stories.map(resolveStoryImage))]);
    const nextOffset = offset + stories.length;
    const page = {
      posts:stories.map((story, index) => toPost(story, generated?.[index], snapshot.refreshedAt, storyImages[index])),
      headlines:snapshot.stories.slice(0,5).map(story=>({title:story.title,url:story.url,author:story.author,time:relativeTime(story.publishedAt,snapshot.refreshedAt)})),
      offset,refreshedAt:snapshot.refreshedAt,generated:Boolean(generated?.some(Boolean)),stale:snapshot.stale,
      hasMore:nextOffset < snapshot.stories.length,
      nextCursor:nextOffset < snapshot.stories.length ? makeCursor(snapshot.id,nextOffset) : undefined,
    };
    await cache?.set(pageKey(snapshot.id,offset),page);
    return page;
  };
  return {
    async getFeed({cursor} = {}) {
      if (env.TECH_NEWS_ENABLED === 'false') throw new Error('Tech news feed is disabled');
      const parsed = readCursor(cursor);
      const snapshot = parsed ? snapshots.get(parsed.snapshotId) || hydrateSnapshot(await cache?.get(snapshotKey(parsed.snapshotId))) : await getCurrentSnapshot();
      if (!snapshot) throw new FeedCursorError('Feed cursor has expired');
      const offset = parsed?.offset || 0;
      if (!snapshot.pages.has(offset)) {
        const pending = buildPage(snapshot,offset).catch(error=>{snapshot.pages.delete(offset);throw error;});
        snapshot.pages.set(offset,pending);
      }
      const page = await snapshot.pages.get(offset);
      page.stale=snapshot.stale;
      return page;
    },
    async getImage(id) {
      if (!/^[a-f0-9]{20}$/.test(id || '')) return undefined;
      return loadImage(id);
    },
  };
}
