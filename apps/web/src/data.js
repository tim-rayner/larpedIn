import { PUBLIC_CHARACTERS as cast } from '@larpedin/shared';

const post = (id, characterId, details) => ({id, ...cast[characterId], ...details});

// All people, fictional companies and engagement counts are satire.
export const posts = [
  post('p1', 'elong-husk', {time:'2h', tag:'AI & hot takes', social:'Jensen Hype and 42 others found this insightful', body:["I replaced my entire engineering team with AI.","Productivity is up 400%. Costs are down 90%.","We haven’t shipped anything yet, but the pitch deck is absolutely incredible.","The future isn’t coming. It’s hallucinating."], tags:'#AI #Leadership #Disruption #Humbled', more:'Update: the AI has requested a senior engineer to review its pull request. Looking for someone with 10 years of experience in a tool released last Tuesday.', likes:1248, comments:186, reposts:42}),
  post('p2', 'mark-zuckerbot', {time:'4h', tag:'The founder life', social:'Trending in your echo chamber', body:["Woke up at 5am. Cold plunge. Journaling. Black coffee.","By 6am I’d already done more than most people do all day.","It’s now 4pm and I still haven’t opened the laptop."], tags:'#FounderMindset #RiseAndGrind', image:true, likes:876, comments:93, reposts:18}),
  post('p3', 'satire-nadella', {time:'6h', tag:'Tech gospel', social:'Because you once clicked on a JavaScript post', body:["Unpopular opinion: your startup doesn’t need Kubernetes.","It needs a customer.","Anyway, here’s my 47-part thread on why I migrated my personal blog to Kubernetes."], tags:'#Engineering #ThoughtLeadership', likes:2106, comments:241, reposts:67}),
  post('p4', 'jensen-hype', {time:'8h', tag:'The founder life', social:'Scam Altman celebrates this', body:["Thrilled to announce we’ve raised £3 million in pre-seed funding.","We have no product. No customers. No business model.","But we do have a .ai domain and a really good relationship with a podcast host.","Stay hungry. Stay fundable."], tags:'#Fundraising #Grateful #Stealth', likes:634, comments:72, reposts:26}),
  post('p5', 'sundar-pitchai', {time:'1d', tag:'Tech gospel', social:'Recommended for your professional development, apparently', body:["Our stand-up now takes 90 minutes.","Our retrospective is a full day.","Our planning meeting has its own planning meeting.","We’ve never been more agile."], tags:'#Agile #Culture #PeopleFirst', likes:1592, comments:204, reposts:53}),
];

export const people = ['elong-husk','mark-zuckerbot','satire-nadella'].map(characterId => cast[characterId]);

export const news = [
  ['Local man discovers a use case for AI','Top story', '8,412 readers', 'After a six-month discovery phase, a founder has successfully summarised an email. The board has called an emergency celebration.'],
  ['“Just learn to code” guy learns to prompt','2h ago', '6,208 readers','The internet’s career advice department has updated its entire curriculum to one sentence. Certificates are already available.'],
  ['Startup pivots from AI to actually useful','4h ago', '4,731 readers','The team is reportedly “exploring the customer problem”, a move investors described as dangerously unconventional.'],
  ['Return to office. Remain on Zoom.','5h ago', '3,186 readers','Commuters are delighted to spend an hour travelling to a different room for the same video call.'],
  ['Thought leader has second thought','6h ago', '2,904 readers','The post has been deleted. A follow-up about the power of vulnerability is expected shortly.'],
];
