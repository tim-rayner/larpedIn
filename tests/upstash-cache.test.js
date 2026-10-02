import test from 'node:test';
import assert from 'node:assert/strict';
import { createUpstashCache, NEWS_CACHE_TTL_SECONDS } from '../src/upstash-cache.js';

test('Upstash cache stores JSON with a one-hour expiry', async () => {
  const commands=[];
  const cache=createUpstashCache({
    env:{UPSTASH_REDIS_REST_URL:'https://redis.example.com/',UPSTASH_REDIS_REST_TOKEN:'secret'},
    fetchImpl:async(url,options)=>{
      const command=JSON.parse(options.body);commands.push({url,command,headers:options.headers});
      return new Response(JSON.stringify({result:command[0]==='GET'?JSON.stringify({edition:1}):'OK'}),{status:200});
    },
  });

  assert.equal(NEWS_CACHE_TTL_SECONDS,3600);
  assert.deepEqual(await cache.get('news'),{edition:1});
  assert.equal(await cache.set('news',{edition:2}),true);
  assert.deepEqual(commands.map(({command})=>command),[
    ['GET','news'],
    ['SET','news',JSON.stringify({edition:2}),'EX',3600],
  ]);
  assert.equal(commands[0].url,'https://redis.example.com');
  assert.equal(commands[0].headers.Authorization,'Bearer secret');
});

test('Upstash cache is optional and degrades to a miss when unavailable', async () => {
  assert.equal(createUpstashCache({env:{}}),undefined);
  const warnings=[];
  const cache=createUpstashCache({
    env:{UPSTASH_REDIS_REST_URL:'https://redis.example.com',UPSTASH_REDIS_REST_TOKEN:'secret'},
    fetchImpl:async()=>new Response('nope',{status:503}),
    log:{warn:message=>warnings.push(message)},
  });
  assert.equal(await cache.get('news'),undefined);
  assert.equal(await cache.set('news',{}),false);
  assert.equal(warnings.length,2);
});
