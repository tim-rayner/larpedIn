import { escapeHtml as e } from './html.js';
export const campaigns = [
  { brand: 'ship.it', mark: 'si', title: 'Ship something. Anything.', copy: 'A project management tool for people who actually finish projects.', cta: 'Meet your next pivot' },
  { brand: 'Touch Grass™', mark: 'tg', title: 'Your next big idea is outside.', copy: 'The original offline experience. No subscription required.', cta: 'Explore outside' },
  { brand: 'Humblebrag Pro', mark: 'hp', title: 'Let your success speak. At length.', copy: 'Turn one small achievement into a 14-paragraph origin story.', cta: 'Find out more' }
];
export function renderAdSlot({ postId, index = 0, campaign = campaigns[index % campaigns.length] }) {
  if (typeof postId !== 'string' || !postId.trim()) throw new TypeError('A placement ID is required');
  return `<aside class="ad-slot" id="ad-${e(postId)}" data-ad-slot data-placement="${e(postId)}" aria-label="Advertisement"><div class="ad-disclosure">Advertisement <span>Keeping the thought leaders fed</span></div><div class="ad-mount" data-ad-mount><div class="ad-brand">${e(campaign.mark)}</div><div class="ad-copy"><strong>${e(campaign.title)}</strong><p>${e(campaign.copy)}</p><span>${e(campaign.brand)} · House ad</span></div><button class="ad-cta" data-action="sponsor">${e(campaign.cta)} <span aria-hidden="true">↗</span></button></div></aside>`;
}
