import { expect, test } from 'bun:test';
import { installPhotoFallback } from '../public/photo-fallback.js';

const img = ({photo = true, complete = false, naturalWidth = 0} = {}) => ({
  removed: false, complete, naturalWidth,
  matches(selector) { return photo && selector === 'img.post-photo'; },
  remove() { this.removed = true; },
});
const fakeDocument = (existing = []) => {
  const listeners = [];
  return {
    addEventListener: (type, fn, capture) => listeners.push({type, fn, capture}),
    querySelectorAll: selector => selector === 'img.post-photo' ? existing : [],
    fire: target => listeners.filter(l => l.type === 'error').forEach(l => l.fn({target})),
    listeners,
  };
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
