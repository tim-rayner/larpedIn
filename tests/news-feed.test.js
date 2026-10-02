import test from 'node:test';
import assert from 'node:assert/strict';
import { createNewsFeedService, extractTechCrunchImage, FeedCursorError, parseTechCrunchRss } from '../src/news-feed.js';
import { renderPost } from '../src/render.js';

const rss = `<?xml version="1.0"?><rss><channel>
<item><title><![CDATA[OpenAI ships &amp; shops]]></title><link>https://techcrunch.com/2026/10/01/example/</link><dc:creator><![CDATA[A. Reporter]]></dc:creator><pubDate>Thu, 01 Oct 2026 12:00:00 +0000</pubDate><category><![CDATA[AI]]></category><category><![CDATA[OpenAI]]></category><description><![CDATA[The company launched a useful feature.]]></description></item>
<item><title>Unsafe link</title><link>https://example.com/not-techcrunch</link><description>Ignore me</description></item>
</channel></rss>`;
const paginatedRss = `<?xml version="1.0"?><rss><channel>${Array.from({length:5},(_,index)=>`<item><title>Story ${index+1}</title><link>https://techcrunch.com/2026/10/01/story-${index+1}/</link><dc:creator>Reporter</dc:creator><pubDate>Thu, 01 Oct 2026 12:00:00 +0000</pubDate><category>Startups</category><description>Summary ${index+1}</description></item>`).join('')}</channel></rss>`;

test('TechCrunch RSS is decoded, bounded, and restricted to original TechCrunch links', () => {
  const stories = parseTechCrunchRss(rss);
  assert.equal(stories.length, 1);
  assert.equal(stories[0].title, 'OpenAI ships & shops');
  assert.deepEqual(stories[0].categories, ['AI','OpenAI']);
});

test('article metadata accepts only TechCrunch upload images', () => {
  assert.equal(extractTechCrunchImage('<meta property="og:image" content="https://techcrunch.com/wp-content/uploads/2026/10/story.jpg?resize=1200,800">'),'https://techcrunch.com/wp-content/uploads/2026/10/story.jpg?resize=900%2C600');
  assert.equal(extractTechCrunchImage('<meta property="og:image" content="https://tracker.example/image.jpg">'),undefined);
});

test('the feed maps news to a fictional character and caches the result', async () => {
  let requests = 0;
  const service = createNewsFeedService({
    env:{TECH_NEWS_ITEM_LIMIT:'1'}, now:()=>Date.parse('2026-10-02T00:00:00Z'),
    fetchImpl:async url => {if(url==='https://techcrunch.com/feed/'){requests++;return new Response(rss,{status:200});}return new Response('<html></html>',{status:200});},
  });
  const first = await service.getFeed();
  const second = await service.getFeed();
  assert.equal(requests, 1);
  assert.equal(first, second);
  assert.equal(first.generated, false);
  assert.equal(first.posts[0].name, 'Scam Altman');
  assert.equal(first.posts[0].company, 'ClosedAI');
  assert.equal(first.posts[0].sourceUrl, 'https://techcrunch.com/2026/10/01/example/');
});

test('OpenAI structured output becomes the post while the source URL remains server-owned', async () => {
  let assignment;
  const service = createNewsFeedService({
    env:{OPENAI_API_KEY:'test-key',OPENAI_MODEL:'gpt-6-luna',TECH_NEWS_ITEM_LIMIT:'1'},
    now:()=>Date.parse('2026-10-02T00:00:00Z'),
    random:()=>0,
    fetchImpl:async (url,options) => {
      if(url==='https://techcrunch.com/feed/')return new Response(rss,{status:200});
      if(url==='https://api.openai.com/v1/responses'){
        assignment=JSON.parse(JSON.parse(options.body).input)[0];
        const generated={posts:[{id:'0',templateId:assignment.template.id,commentary:['A tasteful executive overreaction, clearly presented as opinion.'],hashtags:'#AI #Synergy',category:'AI & hot takes'}]};
        return new Response(JSON.stringify({output:[{content:[{type:'output_text',text:JSON.stringify(generated)}]}]}),{status:200});
      }
      return new Response('<html></html>',{status:200});
    },
  });
  const feed = await service.getFeed();
  assert.equal(feed.generated, true);
  assert.equal(assignment.template.id,'executive-memo');
  assert.equal(assignment.source.summary,'The company launched a useful feature.');
  assert.deepEqual(feed.posts[0].body,['The company launched a useful feature.','A tasteful executive overreaction, clearly presented as opinion.']);
  const html = renderPost(feed.posts[0]);
  assert.match(html, /Read full story here/);
  assert.match(html, /href="https:\/\/techcrunch\.com\/2026\/10\/01\/example\/"/);
  assert.match(html, /rel="noopener noreferrer"/);
});

test('malformed model fields are rejected in favour of factual fallback copy', async () => {
  const service=createNewsFeedService({
    env:{OPENAI_API_KEY:'test-key',TECH_NEWS_ITEM_LIMIT:'1'},random:()=>0,
    fetchImpl:async(url,options)=>{
      if(url==='https://techcrunch.com/feed/')return new Response(rss,{status:200});
      if(url==='https://api.openai.com/v1/responses'){
        const assignment=JSON.parse(JSON.parse(options.body).input)[0];
        const malformed={posts:[{id:'0',templateId:assignment.template.id,commentary:['tags'],hashtags:'AI & hot takes',category:'AI & hot takes'}]};
        return new Response(JSON.stringify({output:[{content:[{type:'output_text',text:JSON.stringify(malformed)}]}]}),{status:200});
      }
      return new Response('<html></html>',{status:200});
    },
  });
  const feed=await service.getFeed();
  assert.equal(feed.generated,false);
  assert.equal(feed.posts[0].body[0],'The company launched a useful feature.');
  assert.match(feed.posts[0].body[1],/ClosedAI/);
  assert.equal(feed.posts[0].tags,'#TechNews #ThoughtLeadership');
});

test('larger pages are generated in bounded three-story batches', async () => {
  const batchSizes=[];
  const service=createNewsFeedService({
    env:{OPENAI_API_KEY:'test-key',TECH_NEWS_PAGE_SIZE:'5',TECH_NEWS_MAX_ITEMS:'5'},random:()=>0,
    fetchImpl:async(url,options)=>{
      if(url==='https://techcrunch.com/feed/')return new Response(paginatedRss,{status:200});
      if(url==='https://api.openai.com/v1/responses'){
        const assignments=JSON.parse(JSON.parse(options.body).input);batchSizes.push(assignments.length);
        const posts=assignments.map(item=>({id:item.id,templateId:item.template.id,commentary:[`Opinion for ${item.source.title}.`],hashtags:'#TechNews #Satire',category:'Tech gospel'}));
        return new Response(JSON.stringify({output:[{content:[{type:'output_text',text:JSON.stringify({posts})}]}]}),{status:200});
      }
      return new Response('<html></html>',{status:200});
    },
  });
  const feed=await service.getFeed();
  assert.deepEqual(batchSizes,[3,2]);
  assert.equal(feed.generated,true);
  assert.equal(feed.posts.length,5);
  assert.ok(feed.posts.every(post=>!/TechCrunch reports/.test(post.body[0])));
});

test('opaque cursors paginate one stable RSS snapshot without duplicate fetches', async () => {
  let requests=0;
  const service=createNewsFeedService({
    env:{TECH_NEWS_PAGE_SIZE:'2',TECH_NEWS_MAX_ITEMS:'5'},
    fetchImpl:async url=>{if(url==='https://techcrunch.com/feed/'){requests++;return new Response(paginatedRss,{status:200});}return new Response('<html></html>',{status:200});},
  });
  const first=await service.getFeed();
  const second=await service.getFeed({cursor:first.nextCursor});
  const third=await service.getFeed({cursor:second.nextCursor});
  assert.equal(requests,1);
  assert.deepEqual([first.posts.length,second.posts.length,third.posts.length],[2,2,1]);
  assert.equal(first.hasMore,true);assert.equal(second.hasMore,true);assert.equal(third.hasMore,false);
  assert.equal(third.nextCursor,undefined);
  assert.equal(new Set([...first.posts,...second.posts,...third.posts].map(post=>post.id)).size,5);
  await assert.rejects(()=>service.getFeed({cursor:'not-a-cursor'}),FeedCursorError);
});

test('the shared cache reuses snapshots and generated pages across server instances', async () => {
  const values=new Map();
  const sharedCache={
    ttlSeconds:3600,
    async get(key){return values.get(key);},
    async set(key,value){values.set(key,structuredClone(value));return true;},
  };
  let rssRequests=0;
  const firstService=createNewsFeedService({
    env:{TECH_NEWS_PAGE_SIZE:'2',TECH_NEWS_MAX_ITEMS:'5'},sharedCache,
    fetchImpl:async url=>{if(url==='https://techcrunch.com/feed/'){rssRequests++;return new Response(paginatedRss,{status:200});}return new Response('<html></html>',{status:200});},
  });
  const first=await firstService.getFeed();
  const second=await firstService.getFeed({cursor:first.nextCursor});

  let coldInstanceRequests=0;
  const coldService=createNewsFeedService({
    env:{TECH_NEWS_PAGE_SIZE:'2',TECH_NEWS_MAX_ITEMS:'5'},sharedCache,
    fetchImpl:async()=>{coldInstanceRequests++;throw new Error('network should not be needed');},
  });
  const sharedFirst=await coldService.getFeed();
  const sharedSecond=await coldService.getFeed({cursor:first.nextCursor});

  assert.equal(rssRequests,1);
  assert.equal(coldInstanceRequests,0);
  assert.deepEqual(sharedFirst,first);
  assert.deepEqual(sharedSecond,second);
  assert.ok([...values.keys()].some(key=>key.includes(':current')));
  assert.ok([...values.keys()].some(key=>key.includes(':snapshot:')));
  assert.equal([...values.keys()].filter(key=>key.includes(':page:')).length,2);
});

test('story photos are discovered, proxied, and reused from the shared cache', async () => {
  const values=new Map();
  const sharedCache={async get(key){return values.get(key);},async set(key,value){values.set(key,structuredClone(value));return true;}};
  const imageBytes=Buffer.from('cached-photo');
  let articleRequests=0,imageRequests=0;
  const fetchImpl=async url=>{
    if(url==='https://techcrunch.com/feed/')return new Response(rss,{status:200});
    if(url==='https://techcrunch.com/2026/10/01/example/') {articleRequests++;return new Response('<meta property="og:image" content="https://techcrunch.com/wp-content/uploads/2026/10/example.jpg">',{status:200});}
    if(String(url).startsWith('https://techcrunch.com/wp-content/uploads/')) {imageRequests++;return new Response(imageBytes,{status:200,headers:{'content-type':'image/jpeg'}});}
    throw new Error(`Unexpected request: ${url}`);
  };
  const firstService=createNewsFeedService({env:{TECH_NEWS_ITEM_LIMIT:'1'},sharedCache,fetchImpl});
  const feed=await firstService.getFeed();
  assert.equal(feed.headlines[0].title,'OpenAI ships & shops');
  assert.match(feed.posts[0].image,/^\/api\/news-image\/[a-f0-9]{20}$/);
  const id=feed.posts[0].image.split('/').pop();
  assert.deepEqual((await firstService.getImage(id)).data,imageBytes);

  const coldService=createNewsFeedService({env:{TECH_NEWS_ITEM_LIMIT:'1'},sharedCache,fetchImpl:async()=>{throw new Error('network should not be needed');}});
  assert.deepEqual((await coldService.getImage(id)).data,imageBytes);
  assert.equal(articleRequests,1);
  assert.equal(imageRequests,1);
  assert.ok([...values.keys()].some(key=>key.includes(':image-meta:')));
  assert.ok([...values.keys()].some(key=>key.includes(':image-data:')));
});
