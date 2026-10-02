import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from '../src/server.js';
import { legalPaths, renderLegalPage } from '../src/legal.js';

test('legal pages are served with required statements', async () => {
  const server = createServer().listen(0, '127.0.0.1');
  await new Promise(r => server.once('listening', r));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const expected = { '/disclaimer': ['not affiliated with', 'Not fake news', 'parody of well-known public figures'], '/privacy': ['does not set cookies', 'local storage'], '/about': ['comedic tech news'], '/accessibility': ['keyboard'], '/terms': ['Governed'.toLowerCase() && 'governed by'] };
    for (const [path, phrases] of Object.entries(expected)) {
      const res = await fetch(base + path);
      assert.equal(res.status, 200);
      const body = await res.text();
      for (const phrase of phrases) assert.ok(body.toLowerCase().includes(phrase.toLowerCase()), `${path} missing "${phrase}"`);
    }
    assert.equal((await fetch(base + '/privacy/')).status, 200);
    const home = await (await fetch(base + '/')).text();
    for (const href of ['/about', '/accessibility', '/privacy', '/terms', '/disclaimer']) assert.ok(home.includes(`href="${href}"`), `footer missing ${href}`);
    assert.equal((await fetch(base + '/legal.css')).status, 200);
  } finally { server.close(); }
});

test('legal pages and client assets do not name the news publisher unless SHOW_NEWS_SOURCE is true', async () => {
  const { readFile } = await import('node:fs/promises');
  for (const path of legalPaths) assert.doesNotMatch(renderLegalPage(path, {}), /techcrunch|yahoo/i, path);
  assert.match(renderLegalPage('/disclaimer', {SHOW_NEWS_SOURCE:'true'}), /TechCrunch/);
  assert.doesNotMatch(await readFile(new URL('../public/app.js', import.meta.url), 'utf8'), /techcrunch/i);
});
