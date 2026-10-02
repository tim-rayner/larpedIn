// Who "you" are on LarpedIn: one of the built-in moguls or a custom one the user made.
// Everything lives in this browser's localStorage. Nothing here talks to a server.
const PREFIX = 'larpedin:';
export const DEFAULT_MOGUL_ID = 'scam-altman';
export const ONBOARDING_VERSION = 1;
export const LIMITS = {name: 40, company: 40, tagline: 90, location: 60, customMoguls: 4};
export const DEFAULTS = {tagline: 'Disrupting things. Mostly my sleep schedule.', location: 'Remote (emotionally)'};

// Only small base64 raster images are ever used as a face. This also keeps the value safe to place in CSS url("").
const PHOTO_PATTERN = /^data:image\/(?:webp|jpeg|png);base64,[A-Za-z0-9+/]+={0,2}$/;
export const isSafePhoto = value => typeof value === 'string' && value.length <= 200_000 && PHOTO_PATTERN.test(value);

const clean = (value, max) => String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
export const firstName = name => String(name ?? '').trim().split(' ')[0] || 'you';
export const roleFor = (company, tagline) => `CEO of ${company} | ${tagline}`;

/** Validates user input for a custom mogul. Returns the cleaned value and any per-field errors. */
export function validateCustomMogul(input = {}) {
  const value = {
    name: clean(input.name, LIMITS.name),
    company: clean(input.company, LIMITS.company),
    tagline: clean(input.tagline, LIMITS.tagline) || DEFAULTS.tagline,
    location: clean(input.location, LIMITS.location) || DEFAULTS.location,
    photo: input.photo,
  };
  const errors = {};
  if (!value.name) errors.name = 'Every mogul needs a name.';
  if (!value.company) errors.company = 'Every mogul needs a company to be CEO of.';
  if (!isSafePhoto(value.photo)) errors.photo = 'Add a photo to continue.';
  return {value, errors, ok: Object.keys(errors).length === 0};
}

const sanitizeStored = entry => {
  if (!entry || typeof entry !== 'object' || typeof entry.id !== 'string' || !/^custom-[a-zA-Z0-9-]{1,64}$/.test(entry.id)) return undefined;
  const {value, ok} = validateCustomMogul(entry);
  return ok ? {id: entry.id, ...value} : undefined;
};

function browserStorage() {
  try { return globalThis.localStorage ?? unavailable; } catch { return unavailable; }
}
const unavailable = {getItem() { return null; }, setItem() { throw new Error('Storage unavailable'); }, removeItem() {}};

/** All persistence for onboarding and identity. `storage` is injectable so it can be tested. */
export function createIdentityStore(storage = browserStorage()) {
  const read = (key, fallback) => { try { const raw = storage.getItem(PREFIX + key); return raw == null ? fallback : JSON.parse(raw) ?? fallback; } catch { return fallback; } };
  const write = (key, value) => { try { storage.setItem(PREFIX + key, JSON.stringify(value)); return true; } catch { return false; } };

  const customMoguls = () => {
    const list = read('custom-moguls', []);
    return Array.isArray(list) ? list.map(sanitizeStored).filter(Boolean).slice(0, LIMITS.customMoguls) : [];
  };
  const activeId = () => { const id = read('mogul', null)?.id; return typeof id === 'string' ? id : DEFAULT_MOGUL_ID; };

  return {
    customMoguls,
    activeId,
    hasOnboarded: () => Boolean(read('onboarded', null)),
    completeOnboarding: () => write('onboarded', {version: ONBOARDING_VERSION, at: new Date().toISOString()}),
    /** Makes a built-in or saved custom mogul the current "you". */
    select: id => write('mogul', {id}),
    /** Creates a custom mogul, or updates it when `input.id` already exists. */
    saveCustomMogul(input) {
      const {value, errors, ok} = validateCustomMogul(input);
      if (!ok) return {ok: false, errors};
      const list = customMoguls();
      const existing = typeof input.id === 'string' && list.some(m => m.id === input.id);
      if (!existing && list.length >= LIMITS.customMoguls) return {ok: false, errors: {limit: `You can keep up to ${LIMITS.customMoguls} custom moguls. Delete one to add another.`}};
      const mogul = {id: existing ? input.id : `custom-${crypto.randomUUID()}`, ...value};
      const next = existing ? list.map(m => m.id === mogul.id ? mogul : m) : [...list, mogul];
      if (!write('custom-moguls', next)) return {ok: false, errors: {storage: 'Your browser has no room left to save this. Try a smaller photo or free up some site data.'}};
      return {ok: true, mogul};
    },
    deleteCustomMogul(id) {
      write('custom-moguls', customMoguls().filter(m => m.id !== id));
      if (activeId() === id) write('mogul', {id: DEFAULT_MOGUL_ID});
    },
    /** The current "you", shaped like a public character. Unknown or deleted ids fall back to the default. */
    resolve(characters) {
      const id = activeId();
      const custom = customMoguls().find(m => m.id === id);
      if (custom) return {...custom, characterId: custom.id, custom: true, role: roleFor(custom.company, custom.tagline)};
      const c = characters[id] ?? characters[DEFAULT_MOGUL_ID];
      return {id: c.characterId, characterId: c.characterId, name: c.name, company: c.company, tagline: c.tagline, location: c.location, avatar: c.avatar, role: c.role, custom: false};
    },
  };
}

/** Points the `.avatar-you` face at the current mogul. The built-ins are sprite positions chosen in CSS. */
export function applyAvatar(me, doc = document) {
  const root = doc.documentElement;
  root.dataset.mogul = me.custom ? 'custom' : me.id;
  if (me.custom && isSafePhoto(me.photo)) root.style.setProperty('--you-photo', `url("${me.photo}")`);
  else root.style.removeProperty('--you-photo');
}

/** Writes the current mogul's text into every `[data-me-*]` placeholder under `root`. */
export function applyText(me, root = document) {
  const set = (selector, text) => root.querySelectorAll(selector).forEach(node => { node.textContent = text; });
  set('[data-me-name]', me.name);
  set('[data-me-role]', me.role);
  set('[data-me-company]', me.company);
  set('[data-me-tagline]', me.tagline);
  set('[data-me-location]', me.location);
  set('[data-me-post-role]', `CEO of ${me.company} | 2.3M fictional followers`);
}

export function applyIdentity(me, doc = document) {
  applyAvatar(me, doc);
  applyText(me, doc);
}
