import { readFile } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
import { createHash, randomUUID } from 'node:crypto';
import { IMAGE_ID_PATTERN, currentUser } from './shared';
import { renderPage, renderPost } from './render.js';
import { legalPaths, renderLegalPage } from './legal.js';
import { news, people } from './data.js';
import { browserCharactersModule } from './browser-characters.js';
import { createEditionClient, EditionExpired } from './edition-client.js';
import { pageOf, readCursor } from './feed.js';
import { showNewsSource } from './flags.js';

const gamesRoot = fileURLToPath(new URL('../../../packages/games/src/', import.meta.url));
const publicRoot = fileURLToPath(new URL('../public/', import.meta.url));
const staticFiles = new Map();
const types = {'.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.svg':'image/svg+xml','.webp':'image/webp','.jpg':'image/jpeg','.txt':'text/plain; charset=utf-8'};
const security = {'X-Content-Type-Options':'nosniff','Referrer-Policy':'strict-origin-when-cross-origin','Permissions-Policy':'camera=(), microphone=(), geolocation=()', 'Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'"};
const houseHtml = renderPage();

function send(request,status,body,type='text/html; charset=utf-8',cache='no-cache',extra={}){
 const raw = Buffer.isBuffer(body)?body:Buffer.from(body);
 const compress = /gzip/.test(request.headers.get('accept-encoding') || '') && /text|json|svg/.test(type);
 const data = compress ? gzipSync(raw) : raw;
 return new Response(request.method==='HEAD'?null:data,{status,headers:{...security,'Content-Type':type,'Content-Length':String(data.length),'Cache-Control':cache,'Vary':'Accept-Encoding',...(compress?{'Content-Encoding':'gzip'}:{}),...extra}});
}

/** Per-instance fixed-window limiter for the post preview; keyed on the first forwarded address. */
const PREVIEW_LIMIT = 30, PREVIEW_WINDOW_MS = 60_000, PREVIEW_MAX_TRACKED = 5_000;
function createLimiter(limit, windowMs, now = Date.now){
 const hits = new Map();
 return request => {
  const key = (request.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'unknown';
  const t = now(); let entry = hits.get(key);
  if(!entry || t - entry.start >= windowMs){
   if(hits.size >= PREVIEW_MAX_TRACKED) for(const [k,v] of hits) if(t - v.start >= windowMs) hits.delete(k);
   if(hits.size >= PREVIEW_MAX_TRACKED) hits.clear();
   entry = {start:t,count:0}; hits.set(key,entry);
  }
  return ++entry.count <= limit;
 };
}

export function createHandler({editions = createEditionClient({baseUrl: process.env.NEWS_SERVICE_URL, token: process.env.NEWS_SERVICE_TOKEN})} = {}){
 /** Latest Edition rendered as the first page, or undefined so the house edition is shown. */
 async function homeFeed(){
  try { return pageOf(await editions.getLatest(),0,{sourceVisible:showNewsSource()}); }
  catch(error){ console.warn(`Showing the house edition: ${error.message}`); return undefined; }
 }
 const previewLimit = createLimiter(PREVIEW_LIMIT, PREVIEW_WINDOW_MS);
 return async function handle(request){
  try {
   const url = new URL(request.url);
   if (request.method === 'POST' && url.pathname === '/api/posts/preview') {
    const origin = request.headers.get('origin');
    let originHost; try{originHost=origin&&new URL(origin).host;}catch{}
    if(!originHost || originHost !== (request.headers.get('host') || url.host)) return send(request,403,'Forbidden','text/plain');
    if(!previewLimit(request))return send(request,429,'Too many requests','text/plain','no-store',{'Retry-After':'60'});
    const body = await request.text();
    if(Buffer.byteLength(body)>16000)return send(request,413,'Post too large','text/plain');
    let parsed; try{parsed=JSON.parse(body);}catch{return send(request,400,'Invalid JSON','text/plain');}
    if(typeof parsed.text!=='string'||!parsed.text.trim()||parsed.text.length>3000)return send(request,400,'Write a post between 1 and 3,000 characters.','text/plain');
    const id=/^user-[a-zA-Z0-9-]{1,80}$/.test(parsed.id||'')?parsed.id:`user-${randomUUID()}`;
    const post={id,...currentUser,avatar:'you',role:`CEO of ${currentUser.company} | 2.3M fictional followers`,time:'Just now',tag:'Your posts',social:'Your post · Simulated audience',body:parsed.text.trim().split(/\n+/),likes:0,comments:0,reposts:0};
    return send(request,200,JSON.stringify({id,html:renderPost(post,0)}),'application/json','no-store');
   }
   if(!['GET','HEAD'].includes(request.method))return send(request,405,'Method not allowed','text/plain');
   if(url.pathname==='/'){
    const feed = await homeFeed();
    return send(request,200,feed?renderPage({...feed,posts:feed.posts}):houseHtml,'text/html; charset=utf-8',feed?'public, max-age=0, s-maxage=60, stale-while-revalidate=300':'public, max-age=0, s-maxage=10');
   }
   const legalPath=url.pathname.length>1?url.pathname.replace(/\/$/,''):url.pathname;
   if(legalPaths.includes(legalPath))return send(request,200,renderLegalPage(legalPath),'text/html; charset=utf-8','public, max-age=300');
   if(url.pathname==='/games/buzzle.js'){const source=await readFile(resolve(gamesRoot,'buzzle.js'));return send(request,200,source,'text/javascript; charset=utf-8','public, max-age=3600');}
   if(url.pathname==='/characters.js')return send(request,200,browserCharactersModule,'text/javascript; charset=utf-8','no-cache');
   if(url.pathname==='/api/feed'){
    const cursorParam = url.searchParams.get('cursor');
    try {
     const cursor = cursorParam===null ? undefined : readCursor(cursorParam);
     if(cursorParam!==null&&!cursor)throw new EditionExpired('Invalid feed cursor');
     const edition = cursor ? await editions.get(cursor.editionId) : await editions.getLatest();
     const page = pageOf(edition,cursor?.offset ?? 0,{sourceVisible:showNewsSource()});
     if(!page.posts.length)throw new EditionExpired('Feed cursor is beyond the available stories');
     const {posts,headlines,sourceName,hasMore,nextCursor,status}=page;
     // Explicit allowlist: Edition internals (id, offset, generated, stale) stay server-side.
     return send(request,200,JSON.stringify({headlines,sourceName,hasMore,nextCursor,status,html:posts.map((post,index)=>renderPost(post,page.offset+index)).join('')}),'application/json',cursor?'public, max-age=3600':'public, max-age=60, stale-while-revalidate=300');
    } catch(error){
     const expired = error instanceof EditionExpired;
     if(!expired)console.error(`News feed unavailable: ${error.message}`);
     return send(request,expired?409:503,JSON.stringify({error:expired?'This news edition has expired. Refresh to load the latest stories.':'Live tech news is temporarily unavailable.'}),'application/json','no-store');
    }
   }
   if(url.pathname.startsWith('/api/news-image/')){
    const id=url.pathname.slice('/api/news-image/'.length);
    const image=IMAGE_ID_PATTERN.test(id)?await editions.getImage(id).catch(()=>undefined):undefined;
    if(!image)return send(request,404,'News image unavailable','text/plain','public, max-age=60');
    return send(request,200,image.data,image.contentType,'public, max-age=31536000, immutable');
   }
   if(url.pathname==='/api/context')return send(request,200,JSON.stringify({news,people}),'application/json');
   if(url.pathname==='/health')return send(request,200,'{"ok":true}','application/json');
   let pathname;try{pathname=decodeURIComponent(url.pathname);}catch{return send(request,400,'Bad path','text/plain');}
   const file=resolve(publicRoot, '.'+pathname);
   if(!file.startsWith(publicRoot.endsWith(sep)?publicRoot:publicRoot+sep))return send(request,403,'Forbidden','text/plain');
   const type=types[extname(file)];if(!type)return send(request,404,'Not found','text/plain');
   let asset=staticFiles.get(file);if(!asset){const data=await readFile(file);asset={data,etag:'"'+createHash('sha256').update(data).digest('hex').slice(0,16)+'"'};staticFiles.set(file,asset);}
   if(request.headers.get('if-none-match')===asset.etag)return new Response(null,{status:304,headers:{...security,'ETag':asset.etag,'Cache-Control':'public, max-age=0, must-revalidate'}});
   return send(request,200,asset.data,type,'public, max-age=0, must-revalidate',{'ETag':asset.etag});
  } catch(error){
   if(error.code!=='ENOENT')console.error(error.message);
   return send(request,error.code==='ENOENT'?404:500,'Unable to complete this request.','text/plain');
  }
 };
}
