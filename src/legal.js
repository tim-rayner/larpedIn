import { escapeHtml as e } from './html.js';
import { renderFooter } from './footer.js';

const UPDATED = '2 October 2026';

const contact = env => env.LEGAL_CONTACT_EMAIL
  ? `<a href="mailto:${e(env.LEGAL_CONTACT_EMAIL)}">${e(env.LEGAL_CONTACT_EMAIL)}</a>`
  : 'the contact address published on this site';
const operator = env => e(env.LEGAL_OPERATOR || 'the LarpedIn operator');

const pages = {
  '/about': {
    title: 'About LarpedIn',
    description: 'LarpedIn is an independent satire site that spreads comedic tech news.',
    body: () => `
<p class="lead">Genuine news. Satirical takes.</p>
<p>LarpedIn is an independent project with one goal: to spread comedic tech news. We take real headlines from the tech world and give them a satirical spin, told through a cast of fictional, exaggerated tech executives who are parodies of public figures.</p>
<h2>What you will find here</h2>
<ul>
<li><strong>Real stories, funny takes.</strong> Each news post is based on a real, linked story. The reaction is satire.</li>
<li><strong>Not fake news.</strong> We do not invent news. The comedy is clearly labelled and always points back to the original reporting.</li>
<li><strong>A simulation, not a social network.</strong> There are no accounts and no real messaging. Anything you post stays in your own browser.</li>
</ul>
<p>LarpedIn is not affiliated with LinkedIn, TechCrunch or any company mentioned. Read the full <a href="/disclaimer">Disclaimer</a>, our <a href="/privacy">Privacy Policy</a> and the <a href="/terms">Terms of Use</a>.</p>`
  },

  '/accessibility': {
    title: 'Accessibility',
    description: 'How to use LarpedIn with a keyboard, screen reader and your device preferences.',
    body: () => `
<p class="lead">We want LarpedIn to be usable by everyone.</p>
<ul>
<li><strong>Keyboard.</strong> Use Tab to move between controls, Enter to activate buttons, Escape to close dialogs, and / to jump to search. A skip link takes you straight to the feed.</li>
<li><strong>Without JavaScript.</strong> The feed can be read without JavaScript. It is only needed to post, react and comment.</li>
<li><strong>Motion and themes.</strong> Animation follows your device's reduced-motion setting, and light, dark and system themes are available from the Me menu.</li>
<li><strong>Structure.</strong> Pages use semantic headings and landmarks and are designed to work with screen readers and browser zoom.</li>
</ul>
<h2>Tell us about a problem</h2>
<p>If something is hard to use, please email us and describe the page and the difficulty. We will do our best to fix it.</p>`
  },

  '/disclaimer': {
    title: 'Disclaimer',
    description: 'LarpedIn is an independent comedy and satire project. It is not affiliated with LinkedIn, TechCrunch or any person or company mentioned.',
    body: env => `
<p class="lead">LarpedIn is an independent satire project, made for fun to spread comedic tech news. It is its own initiative and has no connection to any of the companies, publications or people it jokes about.</p>

<h2>Not affiliated, not endorsed</h2>
<p>LarpedIn is <strong>not affiliated with, endorsed by, sponsored by or connected to</strong> LinkedIn, Microsoft, TechCrunch, Yahoo, OpenAI or any other company, publication or person referred to on this site. LinkedIn is a trademark of its owner. TechCrunch is a trademark of its owner. Any resemblance to the look or feel of another service is part of the parody and is not an attempt to pass this site off as that service.</p>

<h2>Not fake news</h2>
<p>LarpedIn is <strong>not a fake news site and is not trying to deceive anyone</strong>. The news stories it is built on are real, taken from real publishers, and linked to their original source. What we add is a comedic or satirical take on top, clearly presented as comedy. We do not invent news events, and the jokes are not meant to be mistaken for reporting.</p>

<h2>It is satire and a parody of public figures</h2>
<p>LarpedIn is a parody of well-known public figures and of tech industry culture, offered as comedy and commentary on matters of public interest. Everything written in the voice of a character is comedy. The executive personas, their posts, comments, job titles, follower counts, engagement figures, messages, notifications and advertisements are <strong>fictional exaggerations</strong>. They are not statements of fact, are not the real views of any real person, and should not be read as quotes, claims or advice.</p>
<p>Character illustrations are AI-generated editorial caricatures made for commentary and humour. Where a character is loosely inspired by a public figure or company, it is a joke about public life and public products, not a statement about that person's private life or an assertion of any fact about them.</p>

<h2>Where the news comes from</h2>
<p>Each news item is based on a real, publicly available headline and short summary taken from the publisher's public RSS feed (currently TechCrunch). We then add a comedic spin, often with the help of an AI language model. The satirical post is ours; the underlying reporting belongs to its original publisher. Every news-based post links back to the original story so you can read the real thing. Where a post shows a publisher's image, it is displayed for the purpose of identifying and linking to that story and remains the property of its owner.</p>
<p>Because the humour is exaggerated, the jokes and the characters' words are not reporting. For the accurate story, follow the link to the original source.</p>

<h2>No advice</h2>
<p>Nothing on LarpedIn is financial, investment, legal, career, business or technical advice.</p>

<h2>Fictional only: no real accounts</h2>
<p>LarpedIn has no real members, no accounts and no real messaging. When you post, react or comment, you are interacting with a simulation that lives in your own browser. Nobody else sees it.</p>

<h2>Corrections and takedown requests</h2>
<p>If you believe something here is inaccurate, infringes your rights, or you would simply like a reference to you or your organisation changed or removed, please email ${contact(env)} with the page and the details. We will review requests promptly and in good faith.</p>
<p class="muted">This page is a general statement of the nature of this project. It is not legal advice.</p>`
  },

  '/privacy': {
    title: 'Privacy Policy',
    description: 'How LarpedIn handles data: no accounts, no tracking cookies, and your activity stays in your browser.',
    body: env => `
<p class="lead">Short version: no accounts, no tracking cookies, no analytics, and the things you write stay in your own browser.</p>
<p>${operator(env)} (“we”, “us”) runs LarpedIn. This policy explains what happens to information when you use the site. Last updated ${UPDATED}.</p>

<h2>What stays in your browser</h2>
<p>LarpedIn stores your posts, reactions, comments, saved posts, notifications and appearance (light or dark) in your browser's local storage, under keys beginning <code>larpedin:</code>. This data is not sent to us and we cannot see it. It is used only to make the site work as you left it, so it is not tracking. You can remove it at any time with the button below, or by clearing your browser's site data.</p>
<p><button type="button" class="button outline" id="clear-local">Clear my local activity</button> <span id="clear-status" class="muted" role="status"></span></p>

<h2>What reaches our server</h2>
<ul>
<li><strong>Standard request data.</strong> Like every website, when your browser loads a page our server and hosting provider receive your IP address, user agent, the page requested and the time. This is used to deliver the site, keep it secure and diagnose faults, and is held in routine server logs for a short period.</li>
<li><strong>Post previews.</strong> When you publish a post in the simulation, the text is sent to our server so it can be formatted, and the formatted result is returned to you. We do not save, log or share the text.</li>
<li><strong>Nothing else.</strong> We do not ask for your name, email address or any account details, and there is no sign-up.</li>
</ul>

<h2>Cookies and similar technologies</h2>
<p>LarpedIn does not set cookies. It uses local storage only as described above, which is strictly necessary for the features you ask for. We do not use analytics, advertising or tracking cookies, fingerprinting or third-party trackers.</p>

<h2>Advertising</h2>
<p>All advertisements currently shown are fictional “house ads” for made-up brands. No third-party ad scripts load and no advertising data is collected. If we later add a real ad network, we will update this policy and ask for your consent through a consent tool <em>before</em> any ad provider loads or sets anything on your device.</p>

<h2>Service providers we use</h2>
<p>These providers process data to run the site. None of them receives anything you type into LarpedIn.</p>
<ul>
<li><strong>Hosting provider.</strong> Delivers the site and receives standard request data (above).</li>
<li><strong>News publisher feed.</strong> Our server fetches public headlines and images from the publisher (currently TechCrunch). This is server-to-server; your browser does not contact them unless you click an outbound link.</li>
<li><strong>AI language model provider (OpenAI).</strong> Our server sends public news headlines and summaries to generate the comedic posts. Your activity and personal data are not included.</li>
<li><strong>Cache (Upstash Redis).</strong> Stores generated news pages and images for about an hour to keep the site fast. It holds public news content only, not visitor data.</li>
</ul>
<p>Some of these providers may process data outside the UK or EU. Where they do, they rely on recognised safeguards such as standard contractual clauses.</p>

<h2>Outbound links</h2>
<p>Links to original stories take you to third-party sites with their own privacy practices, which we do not control.</p>

<h2>Legal basis (UK and EU GDPR)</h2>
<p>Where we process standard request data, our basis is legitimate interests: running and securing a website. Local storage that powers features you use is strictly necessary and exempt from consent requirements. We do not carry out automated decision-making or profiling.</p>

<h2>Your rights</h2>
<p>You may ask us for access to, correction or deletion of personal data we hold about you, object to or restrict processing, and complain to your data protection authority (in the UK, the Information Commissioner's Office, <a href="https://ico.org.uk" rel="noopener noreferrer">ico.org.uk</a>). Since we hold almost nothing that identifies you, there will usually be little to find, but we will help. Contact ${contact(env)}.</p>

<h2>Children</h2>
<p>LarpedIn is not directed at children under 13 and does not knowingly collect personal data from them.</p>

<h2>Changes</h2>
<p>If this policy changes we will update the date above. Material changes, such as adding real advertising, will be clearly flagged.</p>`
  },

  '/terms': {
    title: 'Terms of Use',
    description: 'The rules for using LarpedIn, an independent satire site.',
    body: env => `
<p class="lead">LarpedIn is a free comedy site. By using it you agree to these simple terms. Last updated ${UPDATED}.</p>

<h2>1. What this is</h2>
<p>LarpedIn is an independent satire and parody project operated by ${operator(env)}. It is provided free, for entertainment only. See the <a href="/disclaimer">Disclaimer</a> for the full picture, including that we are not affiliated with LinkedIn, TechCrunch or any other company mentioned.</p>

<h2>2. Use it sensibly</h2>
<p>You may use the site for personal, non-commercial enjoyment. Please do not: attempt to disrupt, overload or scrape the service at scale; probe it for vulnerabilities without permission; present satirical content as genuine news, statements or quotes from real people or companies; or use the site to harass, defame or impersonate anyone.</p>

<h2>3. Your content</h2>
<p>Anything you write in the simulated feed stays in your browser and is not published to anyone else. You are responsible for what you write and should not enter personal, confidential or unlawful content.</p>

<h2>4. Our content and third-party content</h2>
<p>The LarpedIn name, design, characters, illustrations and original text are ours. Third-party names, trademarks, headlines, summaries and images belong to their respective owners and are used to identify and comment on the original stories, with a link to the source. No licence to third-party material is granted by these terms. Icons are used under the MIT licence.</p>

<h2>5. No warranty</h2>
<p>The site is provided “as is” and “as available”. Content is satirical and may be exaggerated, wrong or out of date. We do not guarantee the site will be uninterrupted or error-free, and nothing on it is advice of any kind.</p>

<h2>6. Limit of liability</h2>
<p>To the fullest extent permitted by law, we are not liable for any loss arising from your use of, or reliance on, the site. Nothing in these terms limits liability that cannot lawfully be limited, including for death or personal injury caused by negligence, or for fraud.</p>

<h2>7. Takedowns and complaints</h2>
<p>If you are a rights holder or a person referred to on the site and have a concern, email ${contact(env)}. We will review it promptly and in good faith.</p>

<h2>8. Changes and governing law</h2>
<p>We may update these terms and the date above will change. These terms are governed by the laws of England and Wales, and the courts of England and Wales have non-exclusive jurisdiction, without affecting any mandatory consumer rights you have where you live.</p>`
  }
};

export const legalPaths = Object.keys(pages);

export function renderLegalPage(path, env = process.env) {
  const page = pages[path];
  if (!page) return undefined;
  return `<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="theme-color" content="#0a66c2"><title>${e(page.title)} | LarpedIn</title><meta name="description" content="${e(page.description)}"><link rel="canonical" href="${e(path)}"><link rel="icon" href="/larpedin-bubble.svg" type="image/svg+xml"><link rel="stylesheet" href="/styles.css"><link rel="stylesheet" href="/legal.css"><script src="/legal.js" defer></script></head><body class="legal-body"><header class="topbar"><div class="nav-inner"><a href="/" class="wordmark" aria-label="LarpedIn home"><img src="/larpedin-bubble.svg" alt="">LarpedIn</a></div></header>
<main class="legal"><article class="card legal-card"><h1>${e(page.title)}</h1>${page.body(env)}<p class="legal-back"><a href="/">← Back to the feed</a></p></article>${renderFooter(path)}</main></body></html>`;
}
