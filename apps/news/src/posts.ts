import { createHash } from 'node:crypto';
import type { Post } from '@larpedin/shared';
import { characterForNewsStory } from './routing.ts';
import type { GeneratedSatire } from './satire.ts';
import type { Story } from './types.ts';

const stableNumber = (value: string, min: number, spread: number) => min + Number.parseInt(createHash('sha256').update(value).digest('hex').slice(0, 8), 16) % spread;

const fallbackClosers: Readonly<Record<string, string>> = Object.freeze({
  'scam-altman': 'At ClosedAI, we believe every news cycle is one API wrapper away from becoming a platform.',
  'elong-husk': 'Teslol expects to solve this with a software update, an ambitious timeline and absolutely no follow-up questions.',
  'mark-zuckerbot': 'MehTa is studying how this development might help people connect more authentically with targeted advertising.',
  'satire-nadella': 'Macrosoft has added this to the roadmap, the cloud, and a licensing tier nobody remembers approving.',
  'jensen-hype': 'NVIDIYAY has reviewed the situation and concluded that it would improve significantly with more compute.',
  'sundar-pitchai': 'Gaggle has launched three internal projects about this. Two may still exist by the end of this sentence.',
});

const sourceLead = (story: Story) => story.description || story.title;

export const postIdFor = (story: Story) => `rss-${createHash('sha256').update(story.url).digest('hex').slice(0, 14)}`;
export const imageIdFor = (story: Story) => createHash('sha256').update(story.url).digest('hex').slice(0, 20);

export function toPost(story: Story, generated: GeneratedSatire | undefined, image: {id: string} | undefined): Post {
  const character = characterForNewsStory(story);
  const copy = generated
    ? {body: [sourceLead(story), ...generated.commentary], tags: generated.tags, tag: generated.tag}
    : {
      body: [sourceLead(story), fallbackClosers[character.characterId] ?? ''].filter(Boolean),
      tags: '#TechNews #ThoughtLeadership',
      tag: story.categories.some(category => /ai/i.test(category)) ? 'AI & hot takes' : 'Tech gospel',
    };
  return {
    id: postIdFor(story), ...character,
    ...(story.publishedAt ? {publishedAt: story.publishedAt} : {}),
    tag: copy.tag, social: story.author || 'News desk',
    body: copy.body, tags: copy.tags, sourceUrl: story.url, sourceName: 'TechCrunch',
    ...(image ? {image: `/api/news-image/${image.id}`, imageAlt: `Photo for: ${story.title}`} : {}),
    likes: stableNumber(`${story.url}:likes`, 120, 2100),
    comments: stableNumber(`${story.url}:comments`, 12, 230),
    reposts: stableNumber(`${story.url}:reposts`, 4, 70),
    generated: Boolean(generated),
  };
}
