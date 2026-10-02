# LarpedIn

Genuine news. Satirical takes.

An independent LinkedIn-inspired parody with a fictional tech CEO network. Server-rendered HTML, vanilla JavaScript, native CSS, locally hosted assets, and no runtime package dependencies.

The main feed turns current stories from the TechCrunch RSS feed into short satirical CEO posts and always links back to the original reporting. Ten non-repeating post structures vary each generated page, while every post begins with the server-owned RSS summary so the factual source remains separate from the fictional reaction.

## Run

Requires Node.js 22 or newer.

```sh
npm start
```

Open http://localhost:3000. The app binds to localhost by default. For a container or hosted service, set `HOST=0.0.0.0` and `PORT` as appropriate. `npm run dev` watches server source changes; restart after changing cached static assets.

Copy `.env.example` to `.env` and set `OPENAI_API_KEY` to enable generated satire. The default `OPENAI_MODEL` is `gpt-6-luna`; it can be changed without modifying source. Add `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` to share each news edition and its generated pages across server instances for one hour. Keys are read only by the server and `.env` is ignored by Git. Without an OpenAI key, the site still loads current RSS stories using a deterministic parody fallback. Without Upstash, it falls back to an in-memory cache.

News attribution is hidden by default: no publisher name, story links, author names or "Read full story" buttons are shown or sent to the browser. Set `SHOW_NEWS_SOURCE=true` to restore them (e.g. once a sponsorship is agreed).

## What works

- Responsive three-column feed and mobile bottom navigation.
- Scam Altman, CEO of ClosedAI, account with 2.3 million fictional followers.
- Publish text posts (up to 3,000 characters). Watch a roughly 40-second simulated burst of reactions and replies from the fictional CEO cast.
- Reactions, comments, saved posts and up to 20 own posts persist in this browser.
- Search, category filtering, Top/Recent sorting, hide, follow, repost and share controls.
- Fictional network, jobs, notifications, messaging, news and buzzword bingo.
- An infinitely scrolling TechCrunch feed, paginated from a stable server-side RSS snapshot and mapped to fictional CEOs, with cached article photography and an original-story link on every post.
- The right rail shows the five latest headlines from the same hourly news edition.
- Light/dark/system appearance; keyboard navigation and native accessible dialogs.
- One clearly labelled, server-rendered house advertisement per post. Provider abstraction supports lazy loading, explicit consent, deduplication, timeout, cancellation and no-fill fallback.
- Complete initial feed readable with JavaScript disabled.

## Deliberate version-one boundaries

This is a local-first parody, not a multi-user service. There is no authentication, shared database, real messaging, checkout or live ad account. Reloaded posts remain visible only in the browser that created them. The server formats post previews but never saves their text. Follow/repost changes are session-only. Activity and engagement figures are fictional.

Real ad revenue needs a publisher account, approved inventory and the production integration described in [docs/ADVERTISING.md](docs/ADVERTISING.md). Google Ads buys ads; AdSense or Ad Manager are the relevant publisher products. A Meta Ads campaign is not a website publisher integration.

## Verify

```sh
npm ci
npm test
# With npm start running in another terminal and Google Chrome installed:
npm run test:browser
npm run check:performance
npx lighthouse http://localhost:3000 --chrome-flags='--headless' --output=html --output-path=docs/lighthouse.html
```

Browser verification uses Playwright with installed Chrome (`channel: 'chrome'`). On a different machine, install Chrome or adapt the launch channel. Unit tests use Node's built-in test runner and need no packages. Development dependencies provide icon asset copying, image optimisation and browser audits only.

See [docs/VERIFICATION.md](docs/VERIFICATION.md) for measured results and limitations.

## Layout

- `src/server.js`: Node HTTP server, SSR, bounded post-preview endpoint, security headers and asset caching.
- `src/render.js`: reusable HTML components and page assembly.
- `src/data.js`: fictional feed, news and people.
- `src/characters.js`: fictional character definitions and private real-company routing metadata.
- `src/news-feed.js`: bounded RSS parsing, factual source anchoring, current headlines, cached article imagery, cursor pagination, story-to-character routing, validated OpenAI generation and an hourly shared feed cache.
- `src/satire-templates.js`: ten varied post structures assigned before generation and stored with the cached page.
- `src/upstash-cache.js`: dependency-free Upstash REST cache with a one-hour expiry and graceful fallback.
- `src/ads.js`: safe ad markup and house campaigns.
- `public/app.js`: progressively enhanced feed interactions and simulated activity.
- `public/ad-controller.js`: independently tested provider lifecycle.
- `public/ad-config.js`: disabled-by-default production ad integration point.
- `public/styles.css`: responsive design tokens and both themes.
- `public/assets/`: checked-in compressed generated images and Phosphor SVG icons.
- `tests/`: ad component tests at agreed public boundaries.
- `scripts/`: reproducible browser and performance checks.

## Git and deployment

This directory is self-contained and ready to become a Git repository. No repository, remote, commit or deployment has been created. The lockfile is included; dependencies, logs, secrets and generated audit files are ignored. Commit the source and local image/icon assets. Do not commit publisher credentials or private keys. `.env.example` documents the two optional server environment variables; the server reads the process environment directly.

Serve behind HTTPS with a reverse proxy/CDN for production. Initial HTML is shared public content and revalidated; post previews are `no-store`. Static assets use ETags and revalidation. HTML and text assets are gzip-compressed. Only explicitly allowed public file extensions are served. The default CSP allows local resources only. Production ad integrations must make targeted changes to that policy.

## Credits and scope

Independent parody; not affiliated with LinkedIn or any featured company. Character illustrations are AI-generated editorial caricatures. All names, companies, posts and engagement shown in the product are fictional. Phosphor icons are MIT-licensed; the license is included in `public/assets/icons/LICENSE`. Generated image provenance is recorded in [docs/ASSETS.md](docs/ASSETS.md).
