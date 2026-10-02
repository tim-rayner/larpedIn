import { expect, test } from 'bun:test';
import { createHandler } from '../src/app.js';

const page = async () => (await createHandler()(new Request('http://web.test/'))).text();

test('the page loads the early boot script before the app so returning users never see a face flash', async () => {
  const html = await page();
  expect(html.indexOf('src="/boot.js"')).toBeGreaterThan(-1);
  expect(html.indexOf('src="/boot.js"')).toBeLessThan(html.indexOf('src="/app.js"'));
});

test('the profile card exposes placeholders the browser fills with the chosen mogul', async () => {
  const html = await page();
  for (const hook of ['data-me-name', 'data-me-company', 'data-me-tagline', 'data-me-location']) expect(html).toContain(hook);
});

test('the identity scripts are served as static files', async () => {
  const get = path => createHandler()(new Request(`http://web.test${path}`));
  for (const path of ['/boot.js', '/identity.js', '/onboarding.js']) {
    const response = await get(path);
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('javascript');
  }
});
