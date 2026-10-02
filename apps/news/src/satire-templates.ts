export interface SatireTemplate { id: string; name: string; structure: string }
export const SATIRE_TEMPLATES: readonly SatireTemplate[] = Object.freeze([
  Object.freeze({
    id:'executive-memo',
    name:'Executive memo',
    structure:'Open with “Team,” then give a concise executive reaction and finish with one dry corporate instruction. Treat every implication as opinion.',
  }),
  Object.freeze({
    id:'unpopular-opinion',
    name:'Unpopular opinion',
    structure:'Start with “Unpopular opinion:” and challenge a conventional business takeaway without disputing the supplied facts.',
  }),
  Object.freeze({
    id:'three-lessons',
    name:'Three lessons',
    structure:'Give exactly three short numbered lessons drawn from the supplied facts, followed by one restrained punchline.',
  }),
  Object.freeze({
    id:'founder-confession',
    name:'Founder confession',
    structure:'Frame the reaction as a fictional founder admitting a personal bias or overreaction. Do not invent an event, customer, employee, or company action.',
  }),
  Object.freeze({
    id:'boardroom-takeaway',
    name:'Boardroom takeaway',
    structure:'Translate the confirmed development into a humorous boardroom takeaway, clearly presented as the fictional author’s interpretation.',
  }),
  Object.freeze({
    id:'careful-prediction',
    name:'Careful prediction',
    structure:'Make one playful prediction using explicit uncertainty such as “might”, “could”, or “my guess”. Never present the prediction as reported fact.',
  }),
  Object.freeze({
    id:'jargon-translator',
    name:'Jargon translator',
    structure:'Explain the development in plain language, then translate it into one absurd but clearly figurative piece of executive jargon.',
  }),
  Object.freeze({
    id:'build-in-public',
    name:'Build-in-public log',
    structure:'Use a compact “What happened / What I learned / What happens next” format. The final section must be opinion or a question, not a new claim.',
  }),
  Object.freeze({
    id:'contrarian-question',
    name:'Contrarian question',
    structure:'Ask one thoughtful contrarian question about the supplied development, explore it briefly, and end without claiming an answer the source does not provide.',
  }),
  Object.freeze({
    id:'gratitude-post',
    name:'Gratitude post',
    structure:'Thank the reporter or news cycle with exaggerated professional sincerity, then give a grounded takeaway and a self-aware humblebrag.',
  }),
]);

export function chooseSatireTemplates(count: number, random: () => number = Math.random): SatireTemplate[] {
  const pool=[...SATIRE_TEMPLATES];
  const chosen: SatireTemplate[]=[];
  while(chosen.length<count){
    if(!pool.length)pool.push(...SATIRE_TEMPLATES);
    const value=Number(random());
    const index=Math.min(pool.length-1,Math.max(0,Math.floor((Number.isFinite(value)?value:0)*pool.length)));
    chosen.push(pool.splice(index,1)[0]!);
  }
  return chosen;
}
