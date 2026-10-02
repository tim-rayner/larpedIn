import { readFileSync } from 'node:fs';
const cache = new Map();
export function icon(name, fill = false) {
  const key = `${name}${fill ? '-fill' : ''}`;
  if (!cache.has(key)) {
    const path = new URL(`../public/assets/icons/${key}.svg`, import.meta.url);
    try { cache.set(key, readFileSync(path, 'utf8').replace('<svg ', '<svg class="icon" aria-hidden="true" focusable="false" ')); }
    catch { return ''; }
  }
  return cache.get(key);
}
