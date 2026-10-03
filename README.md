# LarpedIn

> 🤖 The source code in this repository was not hand written. It was generated with AI coding assistants: Claude Sonnet 5.5 (Anthropic) and GPT 6 Astra (OpenAI).
>
> 🧠 That said, every architectural decision was deliberate and planned by the author.
>
> 🧪 This is a new workflow I'm trialing in my free time, to understand how I can achieve best outputs with AI.


Genuine news. Satirical takes.

An independent LinkedIn-inspired parody with a fictional tech CEO network. Server-rendered HTML, vanilla JavaScript, native CSS, locally hosted assets, and no runtime package dependencies in the client.

The main feed turns current stories from the TechCrunch RSS feed into short satirical CEO posts and always links back to the original reporting. Ten non-repeating post structures vary each generated page, while every post begins with the server-owned RSS summary so the factual source remains separate from the fictional reaction.

## Run

Requires [Bun](https://bun.sh) 1.x. This is a Bun workspaces monorepo:

- `apps/web`: the client. Server-renders the page from the latest Edition and serves the browser app.
- `apps/news`: the news service. Fetches the feed, generates the satire, stores Editions and photos, and exposes them over HTTP.
- `packages/shared`: the `Post`/`Edition` contract and the fictional cast, shared by both.

```sh
bun install
cp apps/news/.env.example apps/news/.env   # add OPENAI_API_KEY; set REFRESH_SECRET
cp apps/web/.env.example apps/web/.env
bun run dev                                # web on :3000, news on :3001
curl -X POST -H "Authorization: Bearer $REFRESH_SECRET" localhost:3001/refresh   # publish the first Edition
```

Open http://localhost:3000. Until the first Refresh has run (or if the service is unreachable) the web app shows the bundled house edition. With no Upstash or R2 settings the service keeps Editions and photos in memory, which is fine for development.

News attribution is hidden by default: no publisher name, story links, author names or "Read full story" buttons are shown to the browser. Set `SHOW_NEWS_SOURCE=true` on the web app to restore them (e.g. once a publisher partnership is agreed).

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
bun install
bun test            # web, news service and shared package
bun run typecheck   # service and shared package (TypeScript)
# With the web app running (PORT=3000, no NEWS_SERVICE_URL) and Google Chrome installed:
cd apps/web && bun run test:browser && bun run check:performance
```

Browser verification uses Playwright with installed Chrome (`channel: 'chrome'`). On a different machine, install Chrome or adapt the launch channel.

See [docs/VERIFICATION.md](docs/VERIFICATION.md) for measured results and limitations.

## Layout

- `apps/web/api/index.js`: Bun entry point. `apps/web/src/app.js`: request handler (SSR from the latest Edition, "load more", image route, bounded post-preview endpoint, security headers, asset caching).
- `apps/web/src/edition-client.js`: reads Editions and photos from the news service with a short in-memory cache and house-edition fallback. `apps/web/src/feed.js`: pages an Edition and hides the publisher unless `SHOW_NEWS_SOURCE` is on.
- `apps/web/src/render.js`: reusable HTML components and page assembly. `src/data.js`: the house edition. `src/ads.js`: safe ad markup and house campaigns.
- `apps/web/public/`: the progressively enhanced browser app, styles and checked-in assets. `apps/web/scripts/`: browser and performance checks.
- `apps/news/api/index.ts`: Bun entry point. `src/app.ts`: routes (`GET /edition`, `GET /edition/:id`, `GET /image/:id`, authenticated `POST /refresh`).
- `apps/news/src/refresh.ts`: builds an Edition (RSS, satire for new Stories only, photos) and publishes it. `src/editions.ts`: current-pointer swap and Expiry. `src/stores.ts`: Upstash, R2 and in-memory stores.
- `apps/news/src/rss.ts`, `routing.ts`, `satire.ts`, `satire-templates.ts`, `posts.ts`, `images.ts`: RSS parsing, story-to-character routing, validated OpenAI generation, ten post structures, Post assembly and photo download.
- `packages/shared/src`: `types.ts` (the contract) and `characters.ts` (the fictional cast and private real-company routing metadata).
- `.github/workflows/refresh.yml`: the hourly cron that calls the service's `POST /refresh`.
- `CONTEXT.md`: domain glossary. `docs/adr/`: architectural decisions.

## Git and deployment

Two Vercel projects from this repo, both on the free tier with `bunVersion` set in each `vercel.json`:

| Project | Root directory | Environment |
| --- | --- | --- |
| web | `apps/web` | `NEWS_SERVICE_URL`, optional `SHOW_NEWS_SOURCE` |
| news | `apps/news` | `REFRESH_SECRET`, `OPENAI_API_KEY`, `UPSTASH_REDIS_REST_URL`/`TOKEN`, `R2_*` |

The hourly Refresh is a GitHub Actions schedule (`.github/workflows/refresh.yml`). Add repository secrets `NEWS_SERVICE_URL` and `REFRESH_SECRET`, then run the workflow once by hand (`workflow_dispatch`) after the first deploy: the service never refreshes itself on an empty read, because that would let any visitor spend model budget. See [docs/adr/0001-news-service-as-functions-with-external-cron.md](docs/adr/0001-news-service-as-functions-with-external-cron.md) for why.

Free-tier notes: Vercel Hobby is restricted to non-commercial use, so check Vercel's current terms before running ads. R2 and Upstash have free tiers; Expiry deletes an Edition's photos once a newer Edition is live, which keeps storage small.

## Credits and scope

Independent parody; not affiliated with LinkedIn or any featured company. Character illustrations are AI-generated editorial caricatures. All names, companies, posts and engagement shown in the product are fictional. Phosphor icons are MIT-licensed; the license is included in `public/assets/icons/LICENSE`. Generated image provenance is recorded in [docs/ASSETS.md](docs/ASSETS.md).
