// A post photo that cannot load is removed, so the post simply has no photo instead of a broken image box.
const PHOTO = 'img.post-photo';

export function installPhotoFallback(doc = document) {
  // Image errors do not bubble, so listen in the capture phase to cover photos rendered later too.
  doc.addEventListener('error', event => { if (event.target?.matches?.(PHOTO)) event.target.remove(); }, true);
  // Photos that failed before this script ran will never fire again.
  for (const photo of doc.querySelectorAll(PHOTO)) if (photo.complete && photo.naturalWidth === 0) photo.remove();
}
