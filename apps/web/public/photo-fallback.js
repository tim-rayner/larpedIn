// A post photo that cannot load is removed, so the post simply has no photo instead of a broken image box.
// One that loads fades in over its placeholder; the fade is only switched on once this script can reveal the photos.
const PHOTO = 'img.post-photo';

export function installPhotoFallback(doc = document) {
  doc.documentElement?.classList.add('photo-fade');
  // Image events do not bubble, so listen in the capture phase to cover photos rendered later too.
  doc.addEventListener('error', event => { if (event.target?.matches?.(PHOTO)) event.target.remove(); }, true);
  doc.addEventListener('load', event => { if (event.target?.matches?.(PHOTO)) event.target.classList.add('loaded'); }, true);
  // Photos that settled before this script ran will never fire again.
  for (const photo of doc.querySelectorAll(PHOTO)) {
    if (!photo.complete) continue;
    if (photo.naturalWidth === 0) photo.remove(); else photo.classList.add('loaded');
  }
}
