import { CHARACTERS, PUBLIC_CHARACTERS, type PublicCharacter } from './shared';
import type { Story } from './types';

export function characterForNewsStory(story: Pick<Story, 'title' | 'url'> & Partial<Pick<Story, 'description' | 'categories'>>): PublicCharacter {
  const searchable = [story.title, story.description, ...(story.categories || [])].filter(Boolean).join(' ').toLowerCase();
  const containsTerm = (term: string) => new RegExp(`(^|[^a-z0-9])${term.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-z0-9]|$)`, 'i').test(searchable);
  for (const [id, c] of Object.entries(CHARACTERS)) {
    const terms = [c.realCompany.name, ...c.realCompany.aliases, ...(c.realCompany.newsAliases || [])];
    if (terms.some(containsTerm)) return PUBLIC_CHARACTERS[id]!;
  }
  const topicRoutes = [
    ['elong-husk', ['transportation','mobility','space','vehicle','energy']],
    ['mark-zuckerbot', ['social','privacy','creator','advertising','messaging']],
    ['satire-nadella', ['enterprise','security','developer','cloud','productivity']],
    ['jensen-hype', ['hardware','compute','chip','robotics','gaming']],
    ['sundar-pitchai', ['search','mobile','commerce','apps']],
    ['scam-altman', ['ai','artificial intelligence','startup','fundraising']],
  ];
  for (const [id, terms] of topicRoutes as [string, string[]][]) {
    if (terms.some(containsTerm)) return PUBLIC_CHARACTERS[id]!;
  }
  const ids = Object.keys(PUBLIC_CHARACTERS);
  let hash = 0;
  for (const char of story.url || story.title || '') hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return PUBLIC_CHARACTERS[ids[hash % ids.length]!]!;
}
