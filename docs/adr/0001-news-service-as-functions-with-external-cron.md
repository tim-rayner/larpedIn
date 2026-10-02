# News service runs as Bun functions, refreshed by an external hourly cron

Hosting has a £0 budget, and Vercel's free tier can neither run a resident process nor (as far as we could confirm) fire hourly crons. So the news service is a set of Bun functions on Vercel, and a GitHub Actions schedule calls its authenticated `POST /refresh` every hour. Editions live in Upstash Redis and images in Cloudflare R2, both on free tiers. Because the service is plain `fetch` handlers, moving to a resident server or to Vercel Cron later is a one-line change to the trigger, not a rewrite.

## Consequences

- GitHub scheduled runs can lag or skip, so readers must always be able to fall back to the last good Edition. The service never deletes an Edition until a newer one is live.
- `POST /refresh` is public-facing and spends OpenAI budget, so it requires `REFRESH_SECRET` and takes a lock so overlapping runs are ignored.
- The first Refresh after a fresh deploy is triggered manually (`workflow_dispatch`); the service does not refresh itself on an empty read.

## Amendment (2026-10-02)

The GitHub schedule on its own proved unreliable: after the workflow was added, not one scheduled run fired in over two hours, and the Edition went stale. The schedule now runs at minute 17 rather than on the hour (GitHub drops runs most often at `:00`), and a daily Vercel Cron (`GET /refresh`, allowed on Hobby) acts as a backstop. For Vercel to authenticate, set `CRON_SECRET` to the same value as `REFRESH_SECRET`. `/refresh` therefore accepts `GET` as well as `POST`.
