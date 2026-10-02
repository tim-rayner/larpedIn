# Advertising integration

## Current behaviour

Each post is rendered with a unique `ad-<post ID>` placement, an explicit **Advertisement** label, reserved layout space and a fictional house campaign. New user posts receive the same component from the server. House campaigns are selected by post index. They are not paid ads and the buttons do not take payment.

The default `public/ad-config.js` exports `provider = null` and `hasAdConsent = () => false`. No external SDK, cookies, tracking pixel or ad auction is loaded. Do not change that to `true` as a substitute for a consent integration.

`IntersectionObserver` requests eligible slots close to the viewport. Each placement can invoke its provider at most once per page lifetime, including failures. There is no ad refresh loop. SDK failures, explicit no-fill, or the 2.5-second timeout preserve the house creative. A detached mount prevents a late callback from replacing the fallback after timeout. Empty mounts do not replace the fallback.

## Public provider contract

Configure an adapter in `public/ad-config.js`:

```js
export const provider = {
  async render({ id, mount, signal }) {
    // Load an approved publisher SDK here, once, after consent.
    // Use the provider's documented APIs; never accept arbitrary HTML from a user.
    // Honour signal.aborted and clean up requests/observers when cancelled.
    // Render a supported creative into mount.
    // Return { filled: false } when no inventory is available.
    return { filled: true };
  }
};
export const hasAdConsent = () => yourConsentPlatform.permitsAdvertising();
```

This is an interface example, not a working Google or Meta adapter. A real SDK may require a connected element rather than a detached mount. In that case implement a reviewed adapter with a reserved connected mount and explicit cleanup, and extend the provider-boundary tests to cover its lifecycle before enabling it.

When the CMP changes permission, dispatch `new Event('larpedin:ad-consent-changed')`. This re-observes placements so those withheld before consent can become eligible. On withdrawal, the production adapter must additionally tear down active vendor resources and follow the vendor's consent-mode requirements; re-observation alone does not undo SDK side effects. CMP state must be available synchronously to `hasAdConsent` and failure must resolve to false.

## Connecting revenue

1. Choose the publisher product and obtain account/site approval. Google **AdSense** or **Ad Manager** serve website inventory; Google **Ads** is the advertiser side. Meta Ads is for buying campaigns, not a drop-in website revenue adapter. Verify the provider's current web publisher support before selecting it.
2. Choose a supported unit size and reserve its full height at each breakpoint before loading it. Current compact house slots are not assumed to meet any vendor's minimum format requirements. A 250px creative needs a 250px reserved area.
3. Integrate an appropriate consent platform. Keep third-party requests disabled until eligible. If a jurisdiction/vendor permits contextual ads without consent, implement that as a separate reviewed policy; it is not enabled here.
4. Add only the SDK/iframe/connect domains required by the actual provider to the CSP in `src/server.js`. Avoid broad wildcard allowances.
5. Add the publisher's verified `ads.txt`, vendor labels and operational privacy information. No placeholder publisher IDs or false authorisations are shipped.
6. Test no-fill, ad blockers, timeout, navigation, consent withdrawal, mobile layout and duplicate requests using the actual SDK in its supported test mode.
7. Evaluate production placement density and content eligibility with the provider. A slot per post does not guarantee every slot should receive paid inventory, provider approval, or revenue. Keep sponsor copy clearly separated from reaction controls and never encourage clicks.

Official references checked during implementation:
- [Google ad placement policies](https://support.google.com/adsense/answer/1346295?hl=en)
- [Google ad placement best practices](https://support.google.com/adsense/answer/1282097)
- [Meta Audience Network](https://www.facebook.com/audiencenetwork/monetize)

## Tested boundaries

The user confirmed the rendered ad component and provider interface as the test seams. Tests cover labels and placement identity, safe content escaping, required placement IDs, consent and visibility gating, provider rejection, timeout, repeat viewport entries, explicit no-fill and pre-cancelled requests. Provider failures cannot block the server-rendered feed.
