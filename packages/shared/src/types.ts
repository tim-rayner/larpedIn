import type { PublicCharacter } from './characters.ts';

/** One satirical, persona-voiced rendering of a Story. Contains no markup. */
export interface Post extends PublicCharacter {
  id: string;
  tag: string;
  social: string;
  body: string[];
  tags: string;
  /** ISO timestamp of the source Story; clients derive the relative time label. */
  publishedAt?: string;
  sourceUrl: string;
  sourceName: string;
  /** Same-origin path served by the client's image route, e.g. /api/news-image/<id>. */
  image?: string;
  imageAlt?: string;
  likes: number;
  comments: number;
  reposts: number;
  /** True when the commentary came from the model rather than the house fallback copy. */
  generated: boolean;
}

export interface Headline {
  title: string;
  url: string;
  author?: string;
  publishedAt?: string;
}

/** The complete set of Posts produced by one hourly Refresh. */
export interface Edition {
  id: string;
  /** Epoch milliseconds when the Refresh that built this Edition finished. */
  refreshedAt: number;
  generated: boolean;
  posts: Post[];
  headlines: Headline[];
  /** Set by the service at read time when the Edition is older than expected. */
  stale?: boolean;
}

export const EDITION_ID_PATTERN = /^[a-f0-9]{16}$/;
export const IMAGE_ID_PATTERN = /^[a-f0-9]{20}$/;
