# Advertising integration

## Current behaviour

Each post is rendered with a unique `ad-<post ID>` placement, an explicit **Advertisement** label, reserved layout space and a "YOUR ADVERT HERE" placeholder. New user posts receive the same component from the server. The placeholder is not a paid ad: its button opens a dialog with a contact email (timr.codes@gmail.com) and no payment is taken.

The default `public/ad-config.js` exports `provider = null` and `hasAdConsent = () => false`. No external SDK, cookies, tracking pixel or ad auction is loaded. Do not change that to `true` as a substitute for a consent integration.

`IntersectionObserver` requests eligible slots close to the viewport. Each placement can invoke its provider at most once per page lifetime, including failures. There is no ad refresh loop. SDK failures, explicit no-fill, or the 2.5-second timeout preserve the placeholder creative. A detached mount prevents a late callback from replacing the fallback after timeout. Empty mounts do not replace the fallback.

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

### Where the adapter connects

| File | Responsibility |
|---|---|
| `apps/web/src/ads.js` | Render a labelled slot and the placeholder creative in the initial HTML. |
| `public/ad-config.js` | Export the selected provider and a synchronous consent check. This is the only file that needs an account-specific adapter. |
| `public/ad-controller.js` | Enforce consent and visibility, prevent duplicate requests, and return `filled` or `fallback`. |
| `public/app.js` | Watch slots as they approach the viewport and replace the placeholder creative only when the adapter has mounted an ad. |
| `apps/web/src/app.js` | Allow the exact SDK and creative origins in the Content Security Policy after selecting a provider. |

For a local wiring check, temporarily replace the exports in `public/ad-config.js` with this **fake provider**. Restart the server after editing the file because static assets are cached in memory:

```js
export const hasAdConsent = () => true; // Local wiring check only. Never use for production consent.

export const provider = {
  async render({ id, mount, signal }) {
    if (signal.aborted) return { filled: false };
    const creative = document.createElement('div');
    creative.textContent = `Test creative for ${id}`;
    mount.append(creative);
    return { filled: true };
  }
};
```

Open the feed, scroll a post close to the viewport, and confirm that its labelled slot shows the test creative. Repeat with `return { filled: false }` or a thrown error and confirm the placeholder remains. Restore the default exports before committing. This checks the app's adapter wiring; it does not test a real publisher SDK or authorise third-party requests.

When the CMP changes permission, dispatch `new Event('larpedin:ad-consent-changed')`. This re-observes placements so those withheld before consent can become eligible. On withdrawal, the production adapter must additionally tear down active vendor resources and follow the vendor's consent-mode requirements; re-observation alone does not undo SDK side effects. CMP state must be available synchronously to `hasAdConsent` and failure must resolve to false.

Run `bun test` for the provider-boundary tests, then `bun run test:browser` (in `apps/web`) with the server running to check the complete feed. Re-run a mobile performance audit with the real provider enabled; the house-ad performance numbers in `docs/VERIFICATION.md` do not cover an ad network.

## Connecting revenue

1. Choose the publisher product and obtain account/site approval. Google **AdSense** or **Ad Manager** serve website inventory; Google **Ads** is the advertiser side. Meta Ads is for buying campaigns, not a drop-in website revenue adapter. Verify the provider's current web publisher support before selecting it.
2. Choose a supported unit size and reserve its full height at each breakpoint before loading it. Current compact house slots are not assumed to meet any vendor's minimum format requirements. A 250px creative needs a 250px reserved area.
3. Integrate an appropriate consent platform. Keep third-party requests disabled until eligible. If a jurisdiction/vendor permits contextual ads without consent, implement that as a separate reviewed policy; it is not enabled here.
4. Add only the SDK/iframe/connect domains required by the actual provider to the CSP in `apps/web/src/app.js`. Avoid broad wildcard allowances.
5. Add the publisher's verified `ads.txt`, vendor labels and operational privacy information. No placeholder publisher IDs or false authorisations are shipped.
6. Test no-fill, ad blockers, timeout, navigation, consent withdrawal, mobile layout and duplicate requests using the actual SDK in its supported test mode.
7. Evaluate production placement density and content eligibility with the provider. A slot per post does not guarantee every slot should receive paid inventory, provider approval, or revenue. Keep sponsor copy clearly separated from reaction controls and never encourage clicks.

Official references checked during implementation:
- [Google ad placement policies](https://support.google.com/adsense/answer/1346295?hl=en)
- [Google ad placement best practices](https://support.google.com/adsense/answer/1282097)
- [Meta Audience Network](https://www.facebook.com/audiencenetwork/monetize)

## Tested boundaries

The user confirmed the rendered ad component and provider interface as the test seams. Tests cover labels and placement identity, safe content escaping, required placement IDs, consent and visibility gating, provider rejection, timeout, repeat viewport entries, explicit no-fill and pre-cancelled requests. Provider failures cannot block the server-rendered feed.
