import { characterForNewsStory } from './routing.ts';
import type { SatireTemplate } from './satire-templates.ts';
import type { Story } from './types.ts';

const OPENAI_RESPONSES_URL = 'https://api.openai.com/v1/responses';
export const DEFAULT_MODEL = 'gpt-6-luna';
const BATCH_SIZE = 3;
const CATEGORIES = ['AI & hot takes', 'Tech gospel', 'The founder life'] as const;
const INSTRUCTIONS = 'You write concise, playful professional-network satire using only the supplied source metadata. The application adds the source summary as a factual first paragraph, so write only 1-3 short reaction paragraphs. Follow each assigned template and return its exact template id. Every factual assertion must be directly supported by the supplied title or summary. Never invent or embellish events, quotes, numbers, motives, causation, allegations, customers, employees, company actions, or private information. Clearly frame inference, prediction, and interpretation as the fictional author’s opinion using words such as “I think”, “might”, or “could”. The named author and company are fictional parody characters. Do not impersonate or quote a real person. Do not include a link; the application adds it. Use 2-4 relevant hashtags. Avoid cruelty, harassment, political persuasion, and jokes about protected traits.';

export interface GeneratedSatire { commentary: string[]; tags: string; tag: string }
export interface SatireOptions { apiKey?: string; model?: string; fetchImpl?: typeof fetch; log?: Pick<Console, 'warn'> }

const outputText = (response: { output?: { content?: { type: string; text?: string }[] }[] }) =>
  response.output?.flatMap(item => item.content ?? []).find(content => content.type === 'output_text')?.text;

/** Returns one entry per story; an entry is undefined when the model's answer failed validation. */
export async function generateSatire(stories: Story[], templates: SatireTemplate[], { apiKey, model = DEFAULT_MODEL, fetchImpl = fetch, log = console }: SatireOptions): Promise<(GeneratedSatire | undefined)[] | undefined> {
  if (!apiKey) return undefined;
  if (stories.length > BATCH_SIZE) {
    const batches: Promise<(GeneratedSatire | undefined)[]>[] = [];
    for (let index = 0; index < stories.length; index += BATCH_SIZE) {
      const slice = stories.slice(index, index + BATCH_SIZE);
      batches.push(
        generateSatire(slice, templates.slice(index, index + BATCH_SIZE), {apiKey, model, fetchImpl, log})
          .then(result => result ?? slice.map(() => undefined))
          .catch(error => {
            log.warn(`Satire generation unavailable for a batch: ${(error as Error).message}`);
            return slice.map(() => undefined);
          }),
      );
    }
    return (await Promise.all(batches)).flat();
  }
  const assignments = stories.map((story, index) => {
    const character = characterForNewsStory(story);
    return {
      id: String(index),
      character: {name: character.name, company: character.company, role: character.role},
      source: {title: story.title, summary: story.description, author: story.author, categories: story.categories, publishedAt: story.publishedAt},
      template: templates[index],
    };
  });
  const schema = {
    type: 'object', additionalProperties: false, required: ['posts'],
    properties: {posts: {
      type: 'array', minItems: stories.length, maxItems: stories.length,
      items: {
        type: 'object', additionalProperties: false, required: ['id', 'templateId', 'commentary', 'hashtags', 'category'],
        properties: {
          id: {type: 'string'},
          templateId: {type: 'string'},
          commentary: {type: 'array', minItems: 1, maxItems: 3, items: {type: 'string', minLength: 1, maxLength: 420}},
          hashtags: {type: 'string', minLength: 3, maxLength: 120},
          category: {type: 'string', enum: [...CATEGORIES]},
        },
      },
    }},
  };
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25_000);
  try {
    const response = await fetchImpl(OPENAI_RESPONSES_URL, {
      method: 'POST', signal: controller.signal,
      headers: {'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json'},
      body: JSON.stringify({
        model, store: false, reasoning: {effort: 'none'}, max_output_tokens: 1800,
        instructions: INSTRUCTIONS,
        input: JSON.stringify(assignments),
        text: {format: {type: 'json_schema', name: 'satire_posts', strict: true, schema}},
      }),
    });
    if (!response.ok) throw new Error(`OpenAI request failed (${response.status})`);
    const text = outputText(await response.json());
    if (!text) throw new Error('OpenAI returned no text');
    const parsed = JSON.parse(text) as { posts: { id: string; templateId: string; commentary: string[]; hashtags: string; category: string }[] };
    const byId = new Map(parsed.posts.map(post => [post.id, post]));
    const categories = new Set<string>(CATEGORIES);
    return stories.map((_story, index) => {
      const post = byId.get(String(index));
      const commentaryValid = Array.isArray(post?.commentary) && post.commentary.length >= 1 && post.commentary.length <= 3 && post.commentary.every(paragraph => typeof paragraph === 'string' && paragraph.trim() && paragraph.length <= 420 && !/^(?:tags?|hashtags?|AI & hot takes|Tech gospel|The founder life)$/i.test(paragraph.trim()));
      const hashtagsValid = typeof post?.hashtags === 'string' && /^#[A-Za-z0-9_]+(?: #[A-Za-z0-9_]+){1,3}$/.test(post.hashtags);
      if (!post || post.templateId !== templates[index]?.id || !commentaryValid || !hashtagsValid || !categories.has(post.category)) return undefined;
      return {commentary: post.commentary.map(paragraph => paragraph.trim()), tags: post.hashtags, tag: post.category};
    });
  } finally { clearTimeout(timeout); }
}
