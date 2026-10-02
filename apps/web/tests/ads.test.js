import { test } from 'bun:test';
import assert from 'node:assert/strict';
import { renderAdSlot } from '../src/ads.js';

test('each post has an identifiable, explicitly labelled advertisement with useful fallback content', () => {
  const html = renderAdSlot({ postId: 'post-1', index: 0 });
  assert.match(html, /id="ad-post-1"/);
  assert.match(html, /Advertisement/);
  assert.match(html, /Ship something/);
  assert.notEqual(html, renderAdSlot({ postId: 'post-2', index: 1 }));
});

test('untrusted ad content is displayed as text and cannot introduce executable markup', () => {
  const html = renderAdSlot({postId: 'x" onmouseover="alert(1)', campaign: {mark: '<img onerror=alert(1)>', title: '<script>alert(1)</script>', copy: 'A & B', brand: '"brand"', cta: '<b>Go</b>'}});
  assert.ok(!html.includes('<script>'));
  assert.ok(!html.includes('<img'));
  assert.match(html, /&lt;script&gt;/);
  assert.match(html, /A &amp; B/);
});

test('invalid placement IDs are rejected so a provider cannot target ambiguous DOM slots', () => {
  assert.throws(() => renderAdSlot({ postId: '' }), /placement/i);
});
