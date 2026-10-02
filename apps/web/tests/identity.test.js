import { expect, test } from 'bun:test';
import { DEFAULT_MOGUL_ID, LIMITS, createIdentityStore, isSafePhoto, validateCustomMogul } from '../public/identity.js';
import { PUBLIC_CHARACTERS } from '../src/shared.js';

const PHOTO = 'data:image/webp;base64,UklGRhoAAABXRUJQVlA4TA0AAAAvAAAAEAcQERGIiP4HAA==';
const memory = () => { const data = new Map(); return {getItem: k => data.get(k) ?? null, setItem: (k, v) => data.set(k, v), removeItem: k => data.delete(k), data}; };
const input = (extra = {}) => ({name: 'Alex Visionary', company: 'Disruptify', photo: PHOTO, ...extra});

test('only small base64 raster images are accepted as a face', () => {
  expect(isSafePhoto(PHOTO)).toBe(true);
  expect(isSafePhoto('data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=')).toBe(false);
  expect(isSafePhoto('data:image/png;base64,AAAA")};background:url(//evil')).toBe(false);
  expect(isSafePhoto('https://example.com/me.png')).toBe(false);
  expect(isSafePhoto(undefined)).toBe(false);
  expect(isSafePhoto(`data:image/png;base64,${'A'.repeat(200_001)}`)).toBe(false);
});

test('a custom mogul needs a name, a company and a photo, and gets funny defaults for the rest', () => {
  const result = validateCustomMogul(input({name: '  Alex   Visionary  '}));
  expect(result.ok).toBe(true);
  expect(result.value.name).toBe('Alex Visionary');
  expect(result.value.tagline.length).toBeGreaterThan(0);
  expect(result.value.location.length).toBeGreaterThan(0);
  expect(validateCustomMogul(input({name: '   '})).errors.name).toBeDefined();
  expect(validateCustomMogul(input({company: ''})).errors.company).toBeDefined();
  expect(validateCustomMogul(input({photo: 'nope'})).errors.photo).toBeDefined();
  expect(validateCustomMogul(input({name: 'x'.repeat(500)})).value.name).toHaveLength(LIMITS.name);
});

test('a new browser has not onboarded and is the default mogul', () => {
  const store = createIdentityStore(memory());
  expect(store.hasOnboarded()).toBe(false);
  expect(store.resolve(PUBLIC_CHARACTERS).id).toBe(DEFAULT_MOGUL_ID);
  store.completeOnboarding();
  expect(store.hasOnboarded()).toBe(true);
});

test('choosing a built-in mogul persists across visits', () => {
  const storage = memory();
  createIdentityStore(storage).select('elong-husk');
  const me = createIdentityStore(storage).resolve(PUBLIC_CHARACTERS);
  expect(me).toMatchObject({id: 'elong-husk', name: 'Elong Husk', company: 'Teslol', custom: false});
});

test('a custom mogul is saved locally, selectable and resolves with its photo', () => {
  const storage = memory();
  const store = createIdentityStore(storage);
  const saved = store.saveCustomMogul(input());
  expect(saved.ok).toBe(true);
  store.select(saved.mogul.id);
  const me = createIdentityStore(storage).resolve(PUBLIC_CHARACTERS);
  expect(me).toMatchObject({name: 'Alex Visionary', company: 'Disruptify', custom: true, photo: PHOTO});
  expect(me.role).toBe(`CEO of Disruptify | ${me.tagline}`);
});

test('saving an existing custom mogul updates it instead of adding another', () => {
  const store = createIdentityStore(memory());
  const {mogul} = store.saveCustomMogul(input());
  store.saveCustomMogul(input({id: mogul.id, name: 'Alexa Visionary'}));
  expect(store.customMoguls()).toHaveLength(1);
  expect(store.customMoguls()[0].name).toBe('Alexa Visionary');
});

test('custom moguls are capped, and deleting the active one falls back to the default', () => {
  const store = createIdentityStore(memory());
  for (let n = 0; n < LIMITS.customMoguls; n++) expect(store.saveCustomMogul(input({name: `Mogul ${n}`})).ok).toBe(true);
  expect(store.saveCustomMogul(input()).errors.limit).toBeDefined();
  const [first] = store.customMoguls();
  store.select(first.id);
  store.deleteCustomMogul(first.id);
  expect(store.customMoguls()).toHaveLength(LIMITS.customMoguls - 1);
  expect(store.resolve(PUBLIC_CHARACTERS).id).toBe(DEFAULT_MOGUL_ID);
});

test('tampered or unknown stored data cannot produce an unsafe or broken identity', () => {
  const storage = memory();
  storage.setItem('larpedin:custom-moguls', JSON.stringify([{id: 'custom-1', name: 'Eve', company: 'Evil', photo: 'javascript:alert(1)'}, 'junk', null]));
  storage.setItem('larpedin:mogul', JSON.stringify({id: 'custom-1'}));
  const store = createIdentityStore(storage);
  expect(store.customMoguls()).toEqual([]);
  expect(store.resolve(PUBLIC_CHARACTERS).id).toBe(DEFAULT_MOGUL_ID);
  storage.setItem('larpedin:custom-moguls', '{not json');
  storage.setItem('larpedin:mogul', JSON.stringify({id: 'not-a-character'}));
  expect(store.resolve(PUBLIC_CHARACTERS).id).toBe(DEFAULT_MOGUL_ID);
});

test('blocked or full storage degrades gracefully instead of throwing', () => {
  const blocked = {getItem() { throw new Error('denied'); }, setItem() { throw new Error('denied'); }, removeItem() {}};
  const store = createIdentityStore(blocked);
  expect(store.hasOnboarded()).toBe(false);
  expect(store.completeOnboarding()).toBe(false);
  expect(store.resolve(PUBLIC_CHARACTERS).id).toBe(DEFAULT_MOGUL_ID);
  expect(store.saveCustomMogul(input()).errors.storage).toBeDefined();
});
