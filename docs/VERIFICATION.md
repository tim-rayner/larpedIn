# Verification

Verified locally on 2 October 2026 with Node 26.4 and installed Google Chrome.

## Results

- **9/9 ad component tests pass.** Test-first cycles observed failure before adding provider consent/visibility gating, error handling, deduplication, timeout, no-fill handling and cancellation. Ad markup escapes untrusted content and requires a placement ID.
- **Browser checks pass** at 320, 375, 390, 768, 1024 and 1440px with no horizontal overflow.
- Publishing renders a server-formatted post, escaping literal script content. Simulated reactions increase, Elong and Mark reply, likes/comments/saves work, and local posts/comments survive reload.
- Live news tests cover RSS entity decoding, TechCrunch-only source and image URLs, current right-rail headlines, cached image bytes, ten non-repeating satire structures, server-owned factual leads, malformed model-output rejection, stable fictional-character routing, opaque cursor pagination without duplicates, hourly Upstash caching across server instances, structured OpenAI output, and escaped original-story links.
- Incoming simulated replies preserve the reader's choice to collapse comments.
- Search, empty state, category filters, network/jobs navigation and simulated messaging work.
- Mobile account access exposes privacy, saved posts and appearance. Dialogs have accessible names, Escape closes them, and a forced light theme retains button contrast on a dark-system device.
- Initial feed displays five complete posts with JavaScript disabled.
- No browser console or runtime errors observed in the exercised flows.

## Performance

Final Lighthouse mobile lab run against localhost:

| Category | Score |
|---|---:|
| Performance | 100 |
| Accessibility | 100 |
| Best practices | 100 |
| SEO | 100 |

| Metric | Result |
|---|---:|
| First contentful paint | 1.0s |
| Largest contentful paint | 1.8s |
| Total blocking time | 0ms |
| Cumulative layout shift | 0 |
| Speed index | 1.3s |

These are Lighthouse's simulated mobile lab conditions, not field measurements or a guarantee of sub-200ms first paint. An accessibility score is automated evidence, not a full assistive-technology audit. Live third-party ads will change performance and require a new measurement.

Thirty warm local HTTP requests measured a 2.79ms median and 3.46ms p95. Total compressed client JavaScript is approximately 9.3KB (app, ad controller and configuration), with 6.0KB compressed CSS. The app uses system fonts, one shared avatar sprite, a lazy-loaded feed photo and no runtime framework.

The saved Lighthouse report, raw browser results and screenshots are available in this local `docs/` folder; `.gitignore` excludes generated evidence from future commits. The concise results in this file are intended to be committed.

## Independent UI review

Two agents reviewed desktop and mobile separately. They checked the implementation against public LinkedIn interface references and familiar feed structure, not a private signed-in pixel capture. Current personalised LinkedIn variants may differ.

Their accepted refinements included composer/sidebar alignment, 225/555/300px desktop columns, a 54px desktop header, stronger post typography, a subtle sort separator, mobile account access, larger mobile controls, dark-mode contrast corrections and named dialogs. Both reviewers accepted the final viewport screenshots with no material remaining visual findings in those views.

Reference material:
- [LinkedIn homepage overview](https://www.linkedin.com/help/linkedin/answer/a523215/linkedin-homepage-overview?lang=en)
- [LinkedIn homepage FAQ](https://www.linkedin.com/help/linkedin/answer/a518701)
- [Public feed reference captured by Guideflow](https://www.guideflow.com/tutorial/how-to-change-industry-in-linkedin-profile)

Intentional differences are LarpedIn branding, fictional tech CEO cartoon avatars, satire category filters, a compact joke line and one labelled ad slot per post.

## Scope

No deployed network measurements, production publisher SDK, real audience, multi-user storage or live monetisation was exercised. Everything that looks like audience activity is explicitly simulated. The local server remains available at http://localhost:3000 while its process is running.
