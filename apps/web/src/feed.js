export const PAGE_SIZE = 6;

export const makeCursor = (editionId, offset) => `${editionId}.${offset}`;
export function readCursor(cursor) {
  const match = /^([a-f0-9]{16})\.([1-9][0-9]{0,3})$/.exec(cursor ?? '');
  return match ? {editionId: match[1], offset: Number(match[2])} : undefined;
}

export function relativeTime(publishedAt, reference) {
  if (!publishedAt) return 'Recently';
  const minutes = Math.max(1, Math.floor((reference - new Date(publishedAt).getTime()) / 60_000));
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  return hours < 24 ? `${hours}h` : `${Math.floor(hours / 24)}d`;
}

/**
 * Turns one page of an Edition into what the page templates render. Naming the news publisher
 * is a presentation decision, so it is stripped here unless SHOW_NEWS_SOURCE is on.
 */
export function pageOf(edition, offset, {sourceVisible, pageSize = PAGE_SIZE}) {
  const slice = edition.posts.slice(offset, offset + pageSize);
  const posts = slice.map(({sourceUrl, sourceName, publishedAt, ...post}) => ({
    ...post, time: relativeTime(publishedAt, edition.refreshedAt),
    ...(sourceVisible ? {sourceUrl, sourceName, social: post.social} : {social: 'News desk'}),
  }));
  const headlines = edition.headlines.map(({title, url, author, publishedAt}) => ({
    title, time: relativeTime(publishedAt, edition.refreshedAt),
    ...(sourceVisible ? {url, author} : {}),
  }));
  const next = offset + slice.length;
  const hasMore = next < edition.posts.length;
  return {
    editionId: edition.id, offset, posts, headlines, sourceName: sourceVisible ? 'TechCrunch' : '',
    generated: Boolean(edition.generated), stale: Boolean(edition.stale), hasMore,
    ...(hasMore ? {nextCursor: makeCursor(edition.id, next)} : {}),
    status: `${edition.generated ? 'Live tech news. Freshly overanalysed by AI.' : 'Live tech news. Lightly seasoned with executive nonsense.'}${edition.stale ? ' Showing the last good edition.' : ''}`,
  };
}
