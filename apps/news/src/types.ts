/** A real news item from the upstream feed, before any satire is applied. */
export interface Story {
  title: string;
  description: string;
  author: string;
  categories: string[];
  url: string;
  publishedAt?: string;
}
