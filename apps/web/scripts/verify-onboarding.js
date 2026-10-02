// End-to-end check of first-run onboarding against a running server: BASE_URL (default http://localhost:3000).
import { chromium, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import sharp from 'sharp';

const base = process.env.BASE_URL || 'http://localhost:3000';
const shots = process.env.SHOTS_DIR;
const shot = async (page, name) => { if (shots) await page.waitForTimeout(450); if (shots) await page.screenshot({path: `${shots}/${name}.png`}); };
const browser = await chromium.launch({channel: 'chrome', headless: true});
const errors = [];
const results = [];
// A wide, off-centre test photo, so the square crop is exercised.
const photo = await sharp({create: {width: 900, height: 500, channels: 3, background: {r: 20, g: 120, b: 200}}}).png().toBuffer();
if (shots) await mkdir(shots, {recursive: true});

async function fresh(viewport = {width: 1280, height: 900}, colorScheme = 'light') {
  const context = await browser.newContext({viewport, colorScheme});
  const page = await context.newPage();
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error' && !/api\/feed/.test(m.text())) errors.push(m.text()); });
  await page.route('**/api/feed*', route => route.fulfill({status: 503, body: '{}'}));
  return {context, page};
}

try {
  const {context, page} = await fresh();
  await page.goto(base);
  const ob = page.locator('#onboarding');
  await expect(ob).toBeVisible();
  await expect(ob).toHaveAccessibleName(/Thrilled to announce/);
  await shot(page, '1-welcome');
  await ob.getByRole('button', {name: 'Get started'}).click();
  await expect(ob.getByRole('heading', {name: 'Real news. Ridiculous takes.'})).toBeVisible();
  await shot(page, '2-how');
  await ob.getByRole('button', {name: 'Choose your mogul'}).click();
  await expect(ob.getByRole('heading', {name: 'Choose your tech mogul'})).toBeVisible();
  await expect(ob.getByRole('radio')).toHaveCount(6);
  await expect(ob.getByRole('radio', {name: /Scam Altman/})).toBeChecked();
  await ob.getByText('Elong Husk').click();
  await expect(ob.getByRole('button', {name: /Continue as Elong/})).toBeVisible();
  await shot(page, '3-pick');

  // Custom mogul: validation, photo upload, local-only.
  await ob.getByRole('button', {name: /Create your own/}).click();
  await expect(ob.getByRole('heading', {name: 'A mogul of one'})).toBeVisible();
  await ob.getByRole('button', {name: 'Create mogul'}).click();
  await expect(ob.locator('#ob-name-err')).toBeVisible();
  await expect(ob.locator('#ob-name')).toBeFocused();
  const outbound = [];
  page.on('request', r => { if (r.method() !== 'GET' || !r.url().startsWith(base)) outbound.push(`${r.method()} ${r.url()}`); });
  await ob.locator('#ob-file').setInputFiles({name: 'me.png', mimeType: 'image/png', buffer: photo});
  await expect(ob.locator('.ob-photo img')).toBeVisible();
  const cropped = await ob.locator('.ob-photo img').evaluate(img => ({src: img.src.slice(0, 22), w: img.naturalWidth, h: img.naturalHeight}));
  expect(cropped).toEqual({src: 'data:image/webp;base64', w: 256, h: 256});
  await ob.locator('#ob-file').setInputFiles({name: 'notes.txt', mimeType: 'text/plain', buffer: Buffer.from('hi')});
  await expect(ob.getByRole('alert').filter({hasText: 'JPG, PNG or WebP'})).toBeVisible();
  await ob.locator('#ob-file').setInputFiles({name: 'me.png', mimeType: 'image/png', buffer: photo});
  await ob.locator('#ob-name').fill('Alex <b>Visionary</b>');
  await ob.locator('#ob-company').fill('Disruptify');
  await expect(ob.locator('#ob-name-err')).toHaveCount(0);
  await expect(ob.locator('#ob-company-err')).toHaveCount(0);
  await shot(page, '4-create');
  await ob.getByRole('button', {name: 'Create mogul'}).click();
  await expect(ob.getByRole('radio', {name: /Alex/})).toBeChecked();
  await shot(page, '5-pick-with-custom');
  await ob.getByRole('button', {name: /Continue as Alex/}).click();
  await expect(ob.getByRole('heading', {name: /You’re all set, Alex/})).toBeVisible();
  await shot(page, '6-ready');
  await ob.getByRole('button', {name: 'Enter the feed'}).click();
  await expect(ob).toHaveCount(0);
  if (outbound.length) throw new Error(`Onboarding made unexpected network requests: ${outbound.join(', ')}`);
  results.push('Welcome, how-it-works, picker, custom mogul with photo upload and validation, ready step; no network traffic');

  // It applied everywhere, and is escaped.
  await expect(page.locator('.profile-card h1')).toContainText('Alex <b>Visionary</b>');
  await expect(page.locator('.profile-card')).toContainText('CEO of Disruptify');
  await expect(page.locator('#welcome-title')).toContainText('Alex');
  const face = await page.locator('.profile-avatar').evaluate(el => getComputedStyle(el).backgroundImage.slice(0, 30));
  expect(face).toContain('data:image/webp');
  expect(await page.evaluate(() => document.querySelectorAll('.profile-card h1 b').length)).toBe(0);
  await page.locator('.composer-start button').click();
  await expect(page.locator('.compose-identity')).toContainText('Alex <b>Visionary</b>');
  await page.locator('#post-text').fill('Day one as a mogul.');
  await page.locator('#compose-form button[type=submit]').click();
  await expect(page.locator('.post').first().locator('[data-me-name]')).toHaveText('Alex <b>Visionary</b>');
  await expect(page.locator('.post').first()).toContainText('CEO of Disruptify');
  await expect(page.locator('.post').first().locator('.comment-list')).toContainText('Elong Husk', {timeout: 10000});
  results.push('Mogul shown on profile, greeting, composer, own post and comments');

  // Persists across visits, with no flash and no second onboarding.
  await page.reload();
  await expect(page.locator('.profile-card h1')).toContainText('Alex');
  await page.waitForTimeout(900);
  await expect(page.locator('#onboarding')).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.dataset.mogul)).toBe('custom');
  const stored = await page.evaluate(() => Object.keys(localStorage).filter(k => k.startsWith('larpedin:')).sort());
  expect(stored).toEqual(expect.arrayContaining(['larpedin:custom-moguls', 'larpedin:mogul', 'larpedin:onboarded']));
  expect(await page.evaluate(() => sessionStorage.length)).toBe(0);
  results.push('Persisted in localStorage (not sessionStorage); onboarding not shown again');

  // Change it later from Me; switch to a built-in; delete the custom one.
  await page.locator('.nav-item.me').click();
  await page.getByRole('button', {name: 'Change my mogul'}).click();
  const change = page.locator('#onboarding');
  await expect(change.getByRole('heading', {name: 'Choose your tech mogul'})).toBeVisible();
  await expect(change.getByRole('radio')).toHaveCount(7);
  await change.getByText('Sundar Pitchai').click();
  await change.getByRole('button', {name: /Switch to Sundar/}).click();
  await expect(page.locator('.profile-card h1')).toContainText('Sundar Pitchai');
  expect(await page.evaluate(() => document.documentElement.dataset.mogul)).toBe('sundar-pitchai');
  await expect(page.locator('#toast')).toContainText('Sundar Pitchai');
  await page.locator('.nav-item.me').click();
  await page.getByRole('button', {name: 'Change my mogul'}).click();
  await page.locator('#onboarding').getByRole('button', {name: /Delete Alex/}).click();
  await page.locator('#onboarding').getByRole('button', {name: 'Delete?'}).click();
  await expect(page.locator('#onboarding').getByRole('radio')).toHaveCount(6);
  await page.keyboard.press('Escape');
  await expect(page.locator('#onboarding')).toHaveCount(0);
  results.push('Change mogul from Me, built-in switch, delete custom mogul, Escape closes');
  await context.close();

  // Skipping counts as done.
  const skip = await fresh();
  await skip.page.goto(base);
  await skip.page.locator('#onboarding').getByRole('button', {name: 'Skip intro'}).first().click();
  await expect(skip.page.locator('#onboarding')).toHaveCount(0);
  await expect(skip.page.locator('.profile-card h1')).toContainText('Scam Altman');
  await skip.page.reload(); await skip.page.waitForTimeout(900);
  await expect(skip.page.locator('#onboarding')).toHaveCount(0);
  results.push('Skip intro keeps the default mogul and is remembered');
  await skip.context.close();

  // Escape on the very first screen also counts as skipping.
  const esc = await fresh();
  await esc.page.goto(base); await expect(esc.page.locator('#onboarding')).toBeVisible();
  await esc.page.keyboard.press('Escape'); await expect(esc.page.locator('#onboarding')).toHaveCount(0);
  await esc.context.close();

  // Phone and dark mode: no horizontal overflow, controls reachable.
  for (const [scheme, name] of [['light', 'mobile'], ['dark', 'mobile-dark']]) {
    const m = await fresh({width: 360, height: 700}, scheme);
    await m.page.goto(base);
    const dlg = m.page.locator('#onboarding');
    await expect(dlg).toBeVisible();
    await shot(m.page, `${name}-1-welcome`);
    await dlg.getByRole('button', {name: 'Get started'}).click();
    await dlg.getByRole('button', {name: 'Choose your mogul'}).click();
    await expect(dlg.getByRole('button', {name: /Continue as/})).toBeInViewport();
    await shot(m.page, `${name}-3-pick`);
    await dlg.getByRole('button', {name: /Create your own/}).click();
    await expect(dlg.getByRole('button', {name: 'Create mogul'})).toBeInViewport();
    await shot(m.page, `${name}-4-create`);
    const overflow = await dlg.evaluate(el => [...el.querySelectorAll('.ob-scroll')].some(s => s.scrollWidth > s.clientWidth + 1));
    if (overflow) throw new Error(`Horizontal overflow inside onboarding on ${name}`);
    await m.context.close();
  }
  results.push('Phone (360px) and dark mode: no overflow, primary action always in view');

  if (errors.length) throw new Error(errors.join('\n'));
  results.push('No console or runtime errors (including CSP violations)');
  console.log(results.join('\n'));
} finally { await browser.close(); }
