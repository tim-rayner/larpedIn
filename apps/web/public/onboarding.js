// First-run onboarding, also reused as "change my mogul". Loaded only when needed.
import { LIMITS, firstName, validateCustomMogul } from './identity.js';

const escape = s => String(s).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const svg = (body, cls = 'ob-icon') => `<svg class="${cls}" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${body}</svg>`;
const icons = {
  check: svg('<path d="M5 12.5l4.5 4.5L19 7.5"/>'),
  plus: svg('<path d="M12 5v14M5 12h14"/>'),
  x: svg('<path d="M6 6l12 12M18 6L6 18"/>'),
  pencil: svg('<path d="M4 20l1-4L16.5 4.5a2 2 0 013 3L8 19l-4 1z"/>'),
  lock: svg('<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 018 0v3"/>'),
  news: svg('<path d="M5 5h11v14H7a2 2 0 01-2-2V5zM16 9h3v8a2 2 0 01-2 2M8 9h5M8 13h5"/>'),
  chat: svg('<path d="M5 6h14v9H10l-5 4V6z"/>'),
  info: svg('<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>'),
  camera: svg('<path d="M4 8h3l1.5-2h7L17 8h3v11H4V8z"/><circle cx="12" cy="13" r="3.5"/>', 'ob-icon ob-icon-lg'),
};

const MAX_UPLOAD_BYTES = 12 * 1024 * 1024;
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const PHOTO_SIZE = 256;

/** Center-crops any picked image to a small square and returns it as a data: URL. The original never leaves memory. */
async function photoFromFile(file) {
  if (!ACCEPTED_TYPES.includes(file.type)) throw new Error('Please choose a JPG, PNG or WebP image.');
  if (file.size > MAX_UPLOAD_BYTES) throw new Error('That image is over 12 MB. Please choose a smaller one.');
  const source = await decode(file);
  const side = Math.min(source.width, source.height);
  if (!side) throw new Error('That image could not be read. Please try another.');
  const canvas = Object.assign(document.createElement('canvas'), {width: PHOTO_SIZE, height: PHOTO_SIZE});
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, PHOTO_SIZE, PHOTO_SIZE);
  ctx.drawImage(source, (source.width - side) / 2, (source.height - side) / 2, side, side, 0, 0, PHOTO_SIZE, PHOTO_SIZE);
  source.close?.();
  const webp = canvas.toDataURL('image/webp', 0.86);
  return webp.startsWith('data:image/webp') ? webp : canvas.toDataURL('image/jpeg', 0.88);
}
async function decode(file) {
  if (window.createImageBitmap) { try { return await createImageBitmap(file); } catch { /* fall through to <img> */ } }
  const url = await new Promise((resolve, reject) => { const r = new FileReader(); r.onload = () => resolve(r.result); r.onerror = () => reject(new Error('That image could not be read.')); r.readAsDataURL(file); });
  return new Promise((resolve, reject) => { const img = new Image(); img.onload = () => resolve(Object.assign(img, {width: img.naturalWidth, height: img.naturalHeight})); img.onerror = () => reject(new Error('That image could not be read. Please try another.')); img.src = url; });
}

/** A generated monogram so a mogul without a photo still has a face. Pure canvas, nothing fetched. */
function monogram(name) {
  const letters = String(name).trim().split(/\s+/).slice(0, 2).map(w => [...w][0]?.toUpperCase() ?? '').join('') || '?';
  const hue = [...String(name)].reduce((h, ch) => (h * 31 + ch.codePointAt(0)) % 360, 211);
  const canvas = Object.assign(document.createElement('canvas'), {width: PHOTO_SIZE, height: PHOTO_SIZE});
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createLinearGradient(0, 0, PHOTO_SIZE, PHOTO_SIZE);
  gradient.addColorStop(0, `hsl(${hue} 62% 38%)`); gradient.addColorStop(1, `hsl(${(hue + 40) % 360} 58% 52%)`);
  ctx.fillStyle = gradient; ctx.fillRect(0, 0, PHOTO_SIZE, PHOTO_SIZE);
  ctx.fillStyle = '#fff'; ctx.font = `600 ${PHOTO_SIZE * 0.42}px Arial, Helvetica, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(letters, PHOTO_SIZE / 2, PHOTO_SIZE / 2 + PHOTO_SIZE * 0.03);
  return canvas.toDataURL('image/jpeg', 0.9);
}

const face = (m, cls = '') => m.custom
  ? `<img class="ob-face ${cls}" src="${escape(m.photo)}" alt="" width="64" height="64">`
  : `<span class="avatar avatar-${escape(m.avatar)} ob-face ${cls}" aria-hidden="true"></span>`;

/**
 * Opens the onboarding dialog.
 * @param {object} options
 * @param {ReturnType<import('./identity.js').createIdentityStore>} options.store
 * @param {Record<string, object>} options.characters public built-in moguls keyed by id
 * @param {object} options.me the current mogul
 * @param {'first-run'|'change'} [options.mode] `change` starts at the picker and skips the tour
 * @param {(me: object, info: {announce: boolean}) => void} options.onChange called whenever the current mogul changes
 */
export function startOnboarding({store, characters, me, mode = 'first-run', onChange}) {
  const dialog = Object.assign(document.createElement('dialog'), {id: 'onboarding', className: 'ob'});
  dialog.setAttribute('aria-labelledby', 'ob-title');
  document.body.append(dialog);

  const builtIns = Object.values(characters);
  const firstRun = mode === 'first-run';
  const state = {step: firstRun ? 'welcome' : 'pick', selected: me.id, draft: {name: '', company: '', tagline: '', location: '', photo: ''}, editing: undefined, deleting: undefined, errors: {}, busy: false};
  const flow = firstRun ? ['welcome', 'how', 'pick', 'ready'] : [];
  const allMoguls = () => [...builtIns.map(c => ({...c, id: c.characterId, custom: false})), ...store.customMoguls().map(m => ({...m, custom: true}))];
  const selectedMogul = () => allMoguls().find(m => m.id === state.selected) ?? allMoguls()[0];
  const commit = () => { store.select(selectedMogul().id); onChange(store.resolve(characters), {announce: !firstRun}); };
  const go = step => { state.step = step; state.errors = {}; render(); };

  const dots = () => flow.length ? `<ol class="ob-dots" aria-label="Step ${flow.indexOf(state.step === 'create' ? 'pick' : state.step) + 1} of ${flow.length}">${flow.map(s => `<li class="${s === (state.step === 'create' ? 'pick' : state.step) ? 'on' : ''}"></li>`).join('')}</ol>` : '<span></span>';
  const shell = (body, buttons) => `<button type="button" class="ob-close" data-ob="close" aria-label="${firstRun && state.step !== 'ready' ? 'Skip intro' : 'Close'}">${icons.x}</button><div class="ob-scroll">${body}</div><footer class="ob-footer">${dots()}<div class="ob-buttons">${buttons}</div></footer>`;
  const heading = (eyebrow, title, sub) => `<p class="ob-eyebrow">${eyebrow}</p><h2 id="ob-title" tabindex="-1">${title}</h2>${sub ? `<p class="ob-sub">${sub}</p>` : ''}`;
  const btn = (action, label, cls = 'outline') => `<button type="button" class="button ${cls}" data-ob="${action}">${label}</button>`;

  const views = {
    welcome: () => shell(
      `<div class="ob-hero"><img src="/larpedin-bubble.svg" alt="" width="72" height="72"><span class="ob-hero-word">LarpedIn</span></div>
       ${heading('Welcome to LarpedIn', 'Thrilled to announce that you’re here.', 'Your daily tech news digest, delivered as the thought leadership it was always meant to be.')}
       <ul class="ob-chips" aria-label="What to expect"><li>Real headlines</li><li>Fictional executives</li><li>Zero business value</li></ul>`,
      `${btn('close', 'Skip intro', 'text-button')}${btn('next', 'Get started', 'primary')}`),

    how: () => shell(
      `${heading('How it works', 'Real news. Ridiculous takes.', 'Every day, LarpedIn takes genuine tech headlines and retells them the way a confident executive would.')}
       <div class="ob-demo" aria-label="Example of a headline becoming a post">
         <div class="ob-demo-in"><small>Real headline <em>(example)</em></small><strong>Chipmaker reports record quarter as AI demand soars</strong></div>
         <div class="ob-demo-arrow" aria-hidden="true">↓</div>
         <div class="ob-demo-out"><span class="avatar avatar-jensen ob-face sm" aria-hidden="true"></span><div><small>The LarpedIn take · Jensen Hype</small><p>Thrilled to announce that people want what we sell. Humbled. Mostly invoiced.</p></div></div>
       </div>
       <ul class="ob-points">
         <li>${icons.news}<div><strong>A fresh digest, every day</strong><p>Headlines come from real tech news and are refreshed throughout the day.</p></div></li>
         <li>${icons.chat}<div><strong>Satire, not spin</strong><p>Fictional tech moguls comment on each story with absolutely no self-awareness.</p></div></li>
         <li>${icons.info}<div><strong>Obviously a parody</strong><p>Characters, companies, followers and engagement are made up. LarpedIn is independent and not affiliated with LinkedIn or anyone it mocks.</p></div></li>
       </ul>`,
      `${btn('back', 'Back')}${btn('next', 'Choose your mogul', 'primary')}`),

    pick: () => {
      const chosen = selectedMogul();
      const cards = allMoguls().map(m => `<li class="ob-card-wrap">
        <input class="ob-radio" type="radio" name="mogul" id="mogul-${escape(m.id)}" value="${escape(m.id)}" ${m.id === chosen.id ? 'checked' : ''}>
        <label class="ob-mogul" for="mogul-${escape(m.id)}">${face(m)}<strong>${escape(m.name)}</strong><span>CEO of ${escape(m.company)}</span><em>${escape(m.tagline)}</em><b class="ob-check" aria-hidden="true">${icons.check}</b></label>
        ${m.custom ? `<div class="ob-card-tools">${state.deleting === m.id
          ? `<button type="button" class="ob-tool danger" data-ob="confirm-delete" data-id="${escape(m.id)}">Delete?</button>`
          : `<button type="button" class="ob-tool" data-ob="edit" data-id="${escape(m.id)}" aria-label="Edit ${escape(m.name)}">${icons.pencil}</button><button type="button" class="ob-tool" data-ob="delete" data-id="${escape(m.id)}" aria-label="Delete ${escape(m.name)}">${icons.x}</button>`}</div>` : ''}
      </li>`).join('');
      const canAdd = store.customMoguls().length < LIMITS.customMoguls;
      return shell(
        `${heading('Your profile', 'Choose your tech mogul', 'You’re the star of your own feed. Pick who you’ll be. Their name, face and company appear on your profile, posts and comments.')}
         <fieldset class="ob-fieldset"><legend class="sr-only">Tech moguls</legend><ul class="ob-grid">${cards}${canAdd ? `<li class="ob-card-wrap"><button type="button" class="ob-mogul ob-create" data-ob="create"><span class="ob-face ob-plus">${icons.plus}</span><strong>Create your own</strong><span>Add your name, photo and company</span></button></li>` : ''}</ul></fieldset>
         <p class="ob-note">${icons.lock}<span>Your choice and any custom mogul stay in this browser. Nothing is uploaded.</span></p>`,
        `${firstRun ? btn('back', 'Back') : btn('close', 'Cancel')}${btn('choose', `<span>${firstRun ? 'Continue as' : 'Switch to'} <span data-ob-name>${escape(firstName(chosen.name))}</span></span>`, 'primary')}`);
    },

    create: () => {
      const d = state.draft, err = state.errors;
      const field = (name, label, ph, max, extra = '') => `<div class="ob-field"><label for="ob-${name}">${label}</label><input id="ob-${name}" name="${name}" value="${escape(d[name])}" maxlength="${max}" placeholder="${escape(ph)}" autocomplete="off" ${extra} ${err[name] ? `aria-invalid="true" aria-describedby="ob-${name}-err"` : ''}>${err[name] ? `<p class="ob-error" id="ob-${name}-err" role="alert">${err[name]}</p>` : ''}</div>`;
      return `<form id="ob-form" class="ob-form" novalidate>${shell(
        `${heading(state.editing ? 'Edit your mogul' : 'Create your own', state.editing ? 'Tweak your mogul' : 'A mogul of one', 'Add a photo and a few details, then you’re ready to disrupt.')}
         <div class="ob-photo-row">
           <label class="ob-photo" for="ob-file" aria-describedby="ob-photo-help">${d.photo ? `<img src="${escape(d.photo)}" alt="Your photo preview" width="96" height="96">` : `<span class="ob-photo-empty">${icons.camera}<span>Add photo</span></span>`}</label>
           <div><input id="ob-file" class="sr-only" type="file" accept="image/jpeg,image/png,image/webp"><label class="button outline ob-upload" for="ob-file">${d.photo ? 'Change photo' : 'Upload photo'}</label><p class="muted" id="ob-photo-help">JPG, PNG or WebP. Cropped to a square on this device.</p>${err.photo ? `<p class="ob-error" role="alert">${err.photo}</p>` : ''}</div>
         </div>
         ${field('name', 'Your name', 'Alex Visionary', LIMITS.name, 'required')}
         ${field('company', 'Your company (you’re the CEO, obviously)', 'Disruptify', LIMITS.company, 'required')}
         ${field('tagline', 'Your tagline <span class="muted">(optional)</span>', 'Pivoting to whatever is trending', LIMITS.tagline)}
         ${field('location', 'Your location <span class="muted">(optional)</span>', 'San Francisco, California', LIMITS.location)}
         ${err.limit || err.storage ? `<p class="ob-error" role="alert">${err.limit || err.storage}</p>` : ''}
         <p class="ob-note">${icons.lock}<span><strong>Stays on this device.</strong> Your photo and details are saved only in this browser’s local storage. They’re never uploaded or shared. Clearing site data removes them.</span></p>`,
        `${btn('cancel-create', 'Back')}<button type="submit" class="button primary" ${state.busy ? 'disabled' : ''}>${state.editing ? 'Save changes' : 'Create mogul'}</button>`)}</form>`;
    },

    ready: () => {
      const m = selectedMogul();
      return shell(
        `<div class="ob-ready"><div class="ob-ready-cover" aria-hidden="true"></div>${face(m, 'xl')}
         ${heading('You’re in', `You’re all set, ${escape(firstName(m.name))}.`, `Your <strong>2,347,891</strong> fictional followers are already waiting.`)}
         <div class="ob-ready-card"><strong>${escape(m.name)}</strong><span>CEO of ${escape(m.company)}</span><em>${escape(m.tagline)}</em></div>
         <p class="muted">You can change your mogul any time from <strong>Me</strong> in the top bar.</p></div>`,
        `${btn('back', 'Change mogul')}${btn('finish', 'Enter the feed', 'primary')}`);
    },
  };

  function render() {
    dialog.dataset.step = state.step;
    dialog.innerHTML = views[state.step]();
    dialog.querySelector('[tabindex="-1"]')?.focus({preventScroll: true});
    dialog.querySelector('.ob-scroll')?.scrollTo(0, 0);
  }

  const show = message => { const el = dialog.querySelector('.ob-live') ?? Object.assign(document.createElement('p'), {className: 'sr-only ob-live'}); el.setAttribute('role', 'status'); el.textContent = message; dialog.append(el); };

  const actions = {
    next: () => go(flow[flow.indexOf(state.step) + 1]),
    back: () => go(firstRun ? flow[Math.max(0, flow.indexOf(state.step) - 1)] : 'pick'),
    close: () => dialog.close(),
    choose() { commit(); if (firstRun) go('ready'); else dialog.close(); },
    finish: () => dialog.close(),
    create() { state.editing = undefined; state.draft = {name: '', company: '', tagline: '', location: '', photo: ''}; go('create'); },
    'cancel-create': () => go('pick'),
    edit(button) { const m = store.customMoguls().find(c => c.id === button.dataset.id); if (!m) return; state.editing = m.id; state.draft = {name: m.name, company: m.company, tagline: m.tagline, location: m.location, photo: m.photo}; go('create'); },
    delete(button) { state.deleting = button.dataset.id; render(); dialog.querySelector(`[data-ob="confirm-delete"]`)?.focus(); },
    'confirm-delete'(button) {
      const wasActive = store.activeId() === button.dataset.id;
      store.deleteCustomMogul(button.dataset.id); state.deleting = undefined;
      if (wasActive) onChange(store.resolve(characters), {announce: false});
      if (state.selected === button.dataset.id) state.selected = store.resolve(characters).id;
      render(); show('Mogul deleted.');
    },
  };

  dialog.addEventListener('click', event => {
    const button = event.target.closest('[data-ob]');
    if (button) { event.preventDefault(); actions[button.dataset.ob]?.(button); return; }
    if (state.deleting && !event.target.closest('.ob-card-tools')) { state.deleting = undefined; render(); }
  });

  dialog.addEventListener('change', async event => {
    const t = event.target;
    if (t.matches('.ob-radio')) {
      state.selected = t.value; state.deleting = undefined;
      const label = dialog.querySelector('[data-ob-name]'); if (label) label.textContent = firstName(selectedMogul().name);
      return;
    }
    if (t.id === 'ob-file' && t.files?.[0]) {
      readDraft();
      for (const key of ['name', 'company']) if (state.draft[key].trim()) delete state.errors[key];
      try { state.draft.photo = await photoFromFile(t.files[0]); delete state.errors.photo; }
      catch (error) { state.errors.photo = error.message; }
      render(); dialog.querySelector('.ob-upload')?.focus();
    }
  });

  // Typing into a field clears its own error straight away rather than waiting for the next submit.
  dialog.addEventListener('input', event => {
    const name = event.target.name;
    if (!state.errors[name] || !event.target.value.trim()) return;
    delete state.errors[name];
    event.target.removeAttribute('aria-invalid'); event.target.removeAttribute('aria-describedby');
    dialog.querySelector(`#ob-${name}-err`)?.remove();
  });

  const readDraft = () => { const form = dialog.querySelector('#ob-form'); if (!form) return; for (const key of ['name', 'company', 'tagline', 'location']) state.draft[key] = form.elements[key].value; };

  dialog.addEventListener('submit', event => {
    if (event.target.id !== 'ob-form') return;
    event.preventDefault(); readDraft();
    const input = {...state.draft, id: state.editing};
    if (!input.photo) input.photo = monogram(input.name || '?');
    const check = validateCustomMogul(input);
    if (!check.ok) { state.errors = check.errors; render(); dialog.querySelector('[aria-invalid="true"]')?.focus(); return; }
    const saved = store.saveCustomMogul(input);
    if (!saved.ok) { state.errors = saved.errors; render(); return; }
    if (saved.mogul.id === store.activeId()) onChange(store.resolve(characters), {announce: false});
    state.selected = saved.mogul.id; state.editing = undefined; state.errors = {};
    go('pick');
    dialog.querySelector(`#mogul-${CSS.escape(saved.mogul.id)}`)?.focus();
    show(`${saved.mogul.name} created and selected.`);
  });

  // Esc and the close button both skip. The backdrop deliberately does not dismiss, so a stray click can't lose progress.
  dialog.addEventListener('close', () => {
    if (firstRun) store.completeOnboarding();
    dialog.remove();
  });

  render();
  dialog.showModal();
  dialog.querySelector('[tabindex="-1"]')?.focus({preventScroll: true}); // showModal() otherwise focuses the close button
  return dialog;
}
