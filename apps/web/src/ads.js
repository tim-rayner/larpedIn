import { escapeHtml as e } from './html.js';
export const campaigns = [
  { brand: 'LarpedIn', mark: 'Ad', title: 'YOUR ADVERT HERE', copy: 'Put your product in front of the thought leaders. Get in touch to book this space.', cta: 'Advertise with us' }
];
export function renderAdSlot({ postId, index = 0, campaign = campaigns[index % campaigns.length] }) {
  if (typeof postId !== 'string' || !postId.trim()) throw new TypeError('A placement ID is required');
  return `<aside class="ad-slot" id="ad-${e(postId)}" data-ad-slot data-placement="${e(postId)}" aria-label="Advertisement"><div class="ad-disclosure">Advertisement <span>Keeping the thought leaders fed</span></div><div class="ad-mount" data-ad-mount><div class="ad-brand">${e(campaign.mark)}</div><div class="ad-copy"><strong>${e(campaign.title)}</strong><p>${e(campaign.copy)}</p><span>${e(campaign.brand)} · Advertise here</span></div><button class="ad-cta" data-action="sponsor">${e(campaign.cta)} <span aria-hidden="true">↗</span></button></div></aside>`;
}
