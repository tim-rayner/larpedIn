import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createAdController } from '../public/ad-controller.js';

test('third-party providers are never contacted before both consent and visibility', async () => {
  let calls = 0;
  const controller = createAdController({ provider: { render: async () => { calls++; } } });
  assert.equal(await controller.load({id: 'post-1', visible: true}), 'house');
  assert.equal(await controller.load({id: 'post-1', consent: true}), 'house');
  assert.equal(calls, 0);
  assert.equal(await controller.load({id: 'post-1', consent: true, visible: true}), 'filled');
  assert.equal(calls, 1);
});

test('provider errors preserve the house ad fallback instead of breaking the feed', async () => {
  const controller = createAdController({provider: {render: async () => {throw new Error('blocked');}}});
  assert.equal(await controller.load({id:'post-2', consent:true, visible:true}), 'fallback');
});

test('repeated viewport entries cannot request the same placement twice', async () => {
  let calls = 0;
  const controller = createAdController({provider: {render: async () => {calls++;}}});
  const slot = {id:'post-3', consent:true, visible:true};
  await Promise.all([controller.load(slot), controller.load(slot)]);
  await controller.load(slot);
  assert.equal(calls, 1);
});

test('a stalled provider times out and leaves the page usable', async () => {
  const controller = createAdController({provider: {render: () => new Promise(() => {})}, timeoutMs: 15});
  assert.equal(await controller.load({id:'post-4', consent:true, visible:true}), 'fallback');
});

test('an unfilled auction retains the house advertisement', async () => {
 const controller=createAdController({provider:{render:async()=>({filled:false})}});
 assert.equal(await controller.load({id:'empty',consent:true,visible:true}),'fallback');
});

test('an already-cancelled slot never starts a provider request', async () => {
 let calls=0;const abort=new AbortController();abort.abort();
 const controller=createAdController({provider:{render:async()=>{calls++;}}});
 assert.equal(await controller.load({id:'cancelled',consent:true,visible:true,signal:abort.signal}),'fallback');
 assert.equal(calls,0);
});
