import { expect, test } from 'bun:test';
import { extractTechCrunchImage, parseTechCrunchRss } from '../src/rss.ts';

const feed = `<?xml version="1.0"?><rss><channel>
<item><title><![CDATA[OpenAI ships &amp; shops]]></title><link>https://techcrunch.com/2026/10/01/example/</link><dc:creator><![CDATA[A. Reporter]]></dc:creator><pubDate>Thu, 01 Oct 2026 12:00:00 +0000</pubDate><category>AI</category><category>OpenAI</category><description><![CDATA[<p>The company launched a useful feature.</p>]]></description></item>
<item><title>Unsafe link</title><link>https://example.com/not-techcrunch</link><description>Ignore me</description></item>
</channel></rss>`;

test('RSS is decoded, bounded, and restricted to original TechCrunch links', () => {
  const stories = parseTechCrunchRss(feed);
  expect(stories).toHaveLength(1);
  expect(stories[0]?.title).toBe('OpenAI ships & shops');
  expect(stories[0]?.categories).toEqual(['AI', 'OpenAI']);
  expect(stories[0]?.description).toBe('The company launched a useful feature.');
});

test('article metadata accepts only TechCrunch upload images', () => {
  expect(extractTechCrunchImage('<meta property="og:image" content="https://techcrunch.com/wp-content/uploads/2026/10/story.jpg?resize=1200,800">'))
    .toBe('https://techcrunch.com/wp-content/uploads/2026/10/story.jpg?resize=900%2C600');
  expect(extractTechCrunchImage('<meta property="og:image" content="https://tracker.example/image.jpg">')).toBeUndefined();
});
