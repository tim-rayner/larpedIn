// Server-only source of truth. Never serialize CHARACTERS directly to a client.
// Real company metadata is for future news routing, not public-facing copy.
export const CURRENT_USER_ID = 'scam-altman';
export const CHARACTERS = Object.freeze({
  'scam-altman': {
    name: 'Scam Altman', company: 'ClosedAI', avatar: 'scam', legacyAvatar: 'you',
    tagline: 'Building the future. Access subject to subscription.', location: 'San Francisco, California',
    reply: 'We are democratising access. The democracy tier starts at £200 a month.',
    realCompany: {id: 'openai', name: 'OpenAI', aliases: ['OpenAI Group PBC'], newsAliases: ['ChatGPT', 'Sam Altman'], source: 'https://openai.com/our-structure/'},
  },
  'elong-husk': {
    name: 'Elong Husk', company: 'Teslol', avatar: 'elong', legacyAvatar: 'gavin',
    tagline: 'Full self-posting. Human supervision still required.', location: 'Austin, Texas',
    reply: 'Interesting. We will have a fully autonomous version of this take next year. Definitely next year.',
    realCompany: {id: 'tesla', name: 'Tesla', aliases: ['Tesla, Inc.', 'Tesla Motors'], newsAliases: ['Elon Musk', 'SpaceX', 'xAI', 'Grok', 'robotaxi', 'autonomous vehicles'], source: 'https://ir.tesla.com/corporate/elon-musk'},
  },
  'mark-zuckerbot': {
    name: 'Mark Zuckerbot', company: 'MehTa', avatar: 'mark', legacyAvatar: 'priya',
    tagline: 'Connecting people to increasingly relevant advertisements.', location: 'Menlo Park, California',
    reply: 'Love this authentic human interaction. We have already turned it into an ad format.',
    message: 'Hey Scam. Quick question. If I wear a new chain to the keynote, does that count as a product launch?',
    messageReply: 'Let’s circle back once the algorithm has decided whether we are friends.',
    realCompany: {id: 'meta', name: 'Meta', aliases: ['Meta Platforms', 'Meta Platforms, Inc.', 'Facebook'], newsAliases: ['Mark Zuckerberg', 'Instagram', 'WhatsApp', 'Threads'], source: 'https://investor.atmeta.com/leadership-and-governance/'},
  },
  'satire-nadella': {
    name: 'Satire Nadella', company: 'Macrosoft', avatar: 'satire', legacyAvatar: 'martin',
    tagline: 'Every surface deserves an assistant. And a licence fee.', location: 'Redmond, Washington',
    reply: 'Great insight. We have added an AI assistant to the button you used to post it.',
    realCompany: {id: 'microsoft', name: 'Microsoft', aliases: ['Microsoft Corporation'], newsAliases: ['Satya Nadella', 'GitHub', 'Azure', 'Copilot', 'Windows', 'Xbox'], source: 'https://news.microsoft.com/source/exec/satya-nadella/'},
  },
  'jensen-hype': {
    name: 'Jensen Hype', company: 'NVIDIYAY', avatar: 'jensen', legacyAvatar: 'oliver',
    tagline: 'The more you buy, the more you hypothetically save.', location: 'Santa Clara, California',
    reply: 'This take needs more compute. I have prepared a very reasonable ninety-six-page quote.',
    realCompany: {id: 'nvidia', name: 'NVIDIA', aliases: ['NVIDIA Corporation'], newsAliases: ['Jensen Huang', 'GeForce', 'CUDA', 'GPU', 'chips', 'semiconductors'], source: 'https://nvidianews.nvidia.com/bios/jensen-huang'},
  },
  'sundar-pitchai': {
    name: 'Sundar Pitchai', company: 'Gaggle', avatar: 'sundar', legacyAvatar: 'nadia',
    tagline: 'Organising the world’s information into sponsored results.', location: 'Mountain View, California',
    reply: 'We launched three products to solve this. Two have been discontinued during this comment.',
    realCompany: {id: 'google', name: 'Google', aliases: ['Google LLC', 'Alphabet', 'Alphabet Inc.'], newsAliases: ['Sundar Pichai', 'Gemini', 'Waymo', 'YouTube', 'Android', 'Chrome'], source: 'https://abc.xyz/'},
  },
});

// Explicit allowlist: future private fields cannot accidentally enter a response.
export function publicCharacter(characterId) {
  const c = CHARACTERS[characterId];
  if (!c) throw new Error(`Unknown character: ${characterId}`);
  return Object.freeze({characterId, name: c.name, company: c.company, avatar: c.avatar,
    legacyAvatar: c.legacyAvatar, role: `CEO of ${c.company} | ${c.tagline}`,
    tagline: c.tagline, location: c.location, reply: c.reply,
    ...(c.message ? {message: c.message, messageReply: c.messageReply} : {})});
}
export const PUBLIC_CHARACTERS = Object.freeze(Object.fromEntries(
  Object.keys(CHARACTERS).map(id => [id, publicCharacter(id)])
));
export const currentUser = PUBLIC_CHARACTERS[CURRENT_USER_ID];

// Exact, case-insensitive entity lookup; avoids false positives in headline text.
const normalizeCompany = name => name.trim().toLowerCase().replace(/[.,]/g, '').replace(/\s+/g, ' ');
export const REAL_COMPANY_TO_CHARACTER = Object.freeze(Object.fromEntries(
  Object.entries(CHARACTERS).flatMap(([id, c]) =>
    [c.realCompany.id, c.realCompany.name, ...c.realCompany.aliases].map(name => [normalizeCompany(name), id]))
));
export function characterForCompany(companyName) {
  if (typeof companyName !== 'string') return undefined;
  const id = REAL_COMPANY_TO_CHARACTER[normalizeCompany(companyName)];
  return Object.hasOwn(PUBLIC_CHARACTERS, id) ? PUBLIC_CHARACTERS[id] : undefined;
}

export function characterForNewsStory(story) {
  const searchable = [story.title, story.description, ...(story.categories || [])].filter(Boolean).join(' ').toLowerCase();
  const containsTerm = term => new RegExp(`(^|[^a-z0-9])${term.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-z0-9]|$)`, 'i').test(searchable);
  for (const [id, c] of Object.entries(CHARACTERS)) {
    const terms = [c.realCompany.name, ...c.realCompany.aliases, ...(c.realCompany.newsAliases || [])];
    if (terms.some(containsTerm)) return PUBLIC_CHARACTERS[id];
  }
  const topicRoutes = [
    ['elong-husk', ['transportation','mobility','space','vehicle','energy']],
    ['mark-zuckerbot', ['social','privacy','creator','advertising','messaging']],
    ['satire-nadella', ['enterprise','security','developer','cloud','productivity']],
    ['jensen-hype', ['hardware','compute','chip','robotics','gaming']],
    ['sundar-pitchai', ['search','mobile','commerce','apps']],
    ['scam-altman', ['ai','artificial intelligence','startup','fundraising']],
  ];
  for (const [id, terms] of topicRoutes) {
    if (terms.some(containsTerm)) return PUBLIC_CHARACTERS[id];
  }
  const ids = Object.keys(PUBLIC_CHARACTERS);
  let hash = 0;
  for (const char of story.url || story.title || '') hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return PUBLIC_CHARACTERS[ids[hash % ids.length]];
}

// A generated browser module containing fictional fields only.
export const browserCharactersModule = `export const characters = ${JSON.stringify(PUBLIC_CHARACTERS)};\nexport const currentUser = characters[${JSON.stringify(CURRENT_USER_ID)}];\n`;
