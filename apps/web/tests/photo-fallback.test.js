import { expect, test } from 'bun:test';
import { installPhotoFallback } from '../public/photo-fallback.js';

const img = ({photo = true, complete = false, naturalWidth = 0} = {}) => {
  const el = {
  removed: false, complete, naturalWidth, classes: new Set(),
  classList: {add(name) { this.owner.classes.add(name); }},
  matches(selector) { return photo && selector === 'img.post-photo'; },
  remove() { this.removed = true; },
  };
  el.classList.owner = el;
  return el;
};
const fakeDocument = (existing = []) => {
  const listeners = [];
  const doc = {
    addEventListener: (type, fn, capture) => listeners.push({type, fn, capture}),
    querySelectorAll: selector => selector === 'img.post-photo' ? existing : [],
    fire: (target, type = 'error') => listeners.filter(l => l.type === type).forEach(l => l.fn({target})),
    documentElement: {classes: new Set(), classList: {add(name) { doc.documentElement.classes.add(name); }}},
    listeners,
  };
  return doc;
};

test('a post photo that fails to load is removed so the post has no broken image', () => {
  const doc = fakeDocument();
  installPhotoFallback(doc);
  const photo = img();
  doc.fire(photo);
  expect(photo.removed).toBe(true);
});

test('errors from anything other than a post photo are ignored', () => {
  const doc = fakeDocument();
  installPhotoFallback(doc);
  const other = img({photo: false});
  doc.fire(other);
  expect(other.removed).toBe(false);
});

test('error events are caught in the capture phase, since image errors do not bubble', () => {
  const doc = fakeDocument();
  installPhotoFallback(doc);
  expect(doc.listeners.every(l => l.capture === true)).toBe(true);
});

test('photos that already failed before the script ran are removed, loaded ones are kept', () => {
  const failed = img({complete: true, naturalWidth: 0});
  const loaded = img({complete: true, naturalWidth: 900});
  const loading = img({complete: false});
  installPhotoFallback(fakeDocument([failed, loaded, loading]));
  expect([failed.removed, loaded.removed, loading.removed]).toEqual([true, false, false]);
});

test('a post photo that loads is marked loaded so it fades in, and other loads are ignored', () => {
  const doc = fakeDocument();
  installPhotoFallback(doc);
  const photo = img(), other = img({photo: false});
  doc.fire(photo, 'load');
  doc.fire(other, 'load');
  expect([photo.classes.has('loaded'), other.classes.has('loaded')]).toEqual([true, false]);
});

test('photos already loaded before the script ran are marked loaded, so they are not hidden by the fade', () => {
  const loaded = img({complete: true, naturalWidth: 900});
  const loading = img({complete: false});
  installPhotoFallback(fakeDocument([loaded, loading]));
  expect([loaded.classes.has('loaded'), loading.classes.has('loaded')]).toEqual([true, false]);
});

test('the fade is only switched on once the script is installed', () => {
  const doc = fakeDocument();
  expect(doc.documentElement.classes.has('photo-fade')).toBe(false);
  installPhotoFallback(doc);
  expect(doc.documentElement.classes.has('photo-fade')).toBe(true);
});
