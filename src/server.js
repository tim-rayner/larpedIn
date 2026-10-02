import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
import { createHash, randomUUID } from 'node:crypto';
import { loadEnvFile } from 'node:process';
import { renderPage, renderPost } from './render.js';
import { legalPaths, renderLegalPage } from './legal.js';
import { news, people } from './data.js';
import { browserCharactersModule, currentUser } from './characters.js';
import { createNewsFeedService, FeedCursorError } from './news-feed.js';
try { loadEnvFile(fileURLToPath(new URL('../.env', import.meta.url))); } catch (error) { if (error.code !== 'ENOENT') throw error; }
const publicRoot = fileURLToPath(new URL('../public/', import.meta.url));
const newsFeed = createNewsFeedService();
const staticFiles = new Map();
const types = {'.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.svg':'image/svg+xml','.webp':'image/webp','.jpg':'image/jpeg','.txt':'text/plain; charset=utf-8'};
const html = renderPage();
const security = {'X-Content-Type-Options':'nosniff','Referrer-Policy':'strict-origin-when-cross-origin','Permissions-Policy':'camera=(), microphone=(), geolocation=()', 'Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'"};
function send(req,res,status,body,type='text/html; charset=utf-8',cache='no-cache'){
 const raw = Buffer.isBuffer(body)?body:Buffer.from(body);
 const compress = /gzip/.test(req.headers['accept-encoding'] || '') && /text|json|svg/.test(type);
 const data = compress ? gzipSync(raw) : raw;
 res.writeHead(status,{...security,'Content-Type':type,'Content-Length':data.length,'Cache-Control':cache,'Vary':'Accept-Encoding',...(compress?{'Content-Encoding':'gzip'}:{})});res.end(req.method==='HEAD'?undefined:data);
}
export function createServer(){return http.createServer(async (req,res)=>{
 try {
  const url = new URL(req.url,'http://localhost');
  if (req.method === 'POST' && url.pathname === '/api/posts/preview') {
   if(req.headers.origin && new URL(req.headers.origin).host !== req.headers.host) return send(req,res,403,'Forbidden','text/plain');
   let body=''; for await(const chunk of req){body+=chunk;if(Buffer.byteLength(body)>16000)return send(req,res,413,'Post too large','text/plain');}
   let parsed; try{parsed=JSON.parse(body);}catch{return send(req,res,400,'Invalid JSON','text/plain');}
   if(typeof parsed.text!=='string'||!parsed.text.trim()||parsed.text.length>3000)return send(req,res,400,'Write a post between 1 and 3,000 characters.','text/plain');
   const id=/^user-[a-zA-Z0-9-]{1,80}$/.test(parsed.id||'')?parsed.id:`user-${randomUUID()}`;
   const post={id,...currentUser,avatar:'you',role:`CEO of ${currentUser.company} | 2.3M fictional followers`,time:'Just now',tag:'Your posts',social:'Your post · Simulated audience',body:parsed.text.trim().split(/\n+/),likes:0,comments:0,reposts:0};
   return send(req,res,200,JSON.stringify({id,html:renderPost(post,0)}),'application/json','no-store');
  }
  if(!['GET','HEAD'].includes(req.method))return send(req,res,405,'Method not allowed','text/plain');
  if(url.pathname==='/')return send(req,res,200,html);
  const legalPath=url.pathname.length>1?url.pathname.replace(/\/$/,''):url.pathname;
  if(legalPaths.includes(legalPath))return send(req,res,200,renderLegalPage(legalPath),'text/html; charset=utf-8','public, max-age=300');
  if(url.pathname==='/characters.js')return send(req,res,200,browserCharactersModule,'text/javascript; charset=utf-8','no-cache');
  if(url.pathname==='/api/feed'){
   try { const feed=await newsFeed.getFeed({cursor:url.searchParams.get('cursor')??undefined});return send(req,res,200,JSON.stringify({...feed,posts:undefined,html:feed.posts.map((post,index)=>renderPost(post,feed.offset+index)).join('')}),'application/json','public, max-age=60, stale-while-revalidate=300'); }
   catch(error){console.error(`News feed unavailable: ${error.message}`);return send(req,res,error instanceof FeedCursorError?409:503,JSON.stringify({error:error instanceof FeedCursorError?'This news edition has expired. Refresh to load the latest stories.':'Live tech news is temporarily unavailable.'}),'application/json','no-store');}
  }
  if(url.pathname.startsWith('/api/news-image/')){
   const id=url.pathname.slice('/api/news-image/'.length);
   const image=await newsFeed.getImage(id);
   if(!image)return send(req,res,404,'News image unavailable','text/plain','public, max-age=60');
   return send(req,res,200,image.data,image.contentType,'public, max-age=3600, stale-while-revalidate=86400');
  }
  if(url.pathname==='/api/context')return send(req,res,200,JSON.stringify({news,people}),'application/json');
  if(url.pathname==='/health')return send(req,res,200,'{"ok":true}','application/json');
  let pathname;try{pathname=decodeURIComponent(url.pathname);}catch{return send(req,res,400,'Bad path','text/plain');}
  const file=resolve(publicRoot, '.'+pathname);
  if(!file.startsWith(publicRoot.endsWith(sep)?publicRoot:publicRoot+sep))return send(req,res,403,'Forbidden','text/plain');
  const type=types[extname(file)];if(!type)return send(req,res,404,'Not found','text/plain');
  let asset=staticFiles.get(file);if(!asset){const data=await readFile(file);asset={data,etag:'"'+createHash('sha256').update(data).digest('hex').slice(0,16)+'"'};staticFiles.set(file,asset);}
  res.setHeader('ETag',asset.etag);if(req.headers['if-none-match']===asset.etag){res.writeHead(304,{...security,'Cache-Control':'public, max-age=0, must-revalidate'});return res.end();}
  return send(req,res,200,asset.data,type,'public, max-age=0, must-revalidate');
 }catch(error){if(error.code!=='ENOENT')console.error(error.message);if(!res.headersSent)send(req,res,error.code==='ENOENT'?404:500,'Unable to complete this request.','text/plain');else res.end();}
});}
if(process.argv[1]===fileURLToPath(import.meta.url)){const port=Number(process.env.PORT||3000);createServer().listen(port,process.env.HOST||'127.0.0.1',()=>console.log(`LarpedIn running at http://localhost:${port}`));}
