/** Production integration point. Keep null until a publisher/CMP is configured.
 * A provider implements render({id, mount, signal}) and returns {filled:boolean}.
 * Never load a third-party SDK at module scope: render is called after consent.
 * See docs/ADVERTISING.md for the provider contract and production checklist.
 */
export const provider = null;
export const hasAdConsent = () => false;
