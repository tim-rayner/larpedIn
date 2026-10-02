# LarpedIn

A satirical professional-networking feed built on real tech news. Real stories are rewritten as executive-persona posts.

## Language

**Story**:
A real news item taken from the upstream publisher's feed, before any satire is applied.
_Avoid_: Article, headline (a headline is only a Story's title)

**Post**:
A satirical, persona-voiced rendering of one Story, shown in the feed.
_Avoid_: Card, item, update

**Edition**:
The complete set of Posts produced by one hourly refresh. The current Edition is what every reader sees until the next one replaces it.
_Avoid_: Snapshot, batch, feed (the feed is how readers page through an Edition)

**Refresh**:
The hourly act of building a new Edition from the latest Stories.
_Avoid_: Sync, update, cron run

**Expiry**:
The moment an Edition and its images stop being served and are removed, once a newer Edition has replaced it and its TTL has passed.
_Avoid_: Eviction, cleanup
