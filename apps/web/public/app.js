import { createAdController } from './ad-controller.js';
import { provider, hasAdConsent } from './ad-config.js';
import { characters } from '/characters.js';
import { greetingFor } from './greeting.js';
import { installPhotoFallback } from './photo-fallback.js';
import { createIdentityStore, applyIdentity, applyText, firstName } from './identity.js';
import * as buzzle from '/games/buzzle.js';
const $ = (s, root=document) => root.querySelector(s);
const $$ = (s, root=document) => [...root.querySelectorAll(s)];
const escape = s => String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const storage = {get(key,fallback){try{return JSON.parse(localStorage.getItem('larpedin:'+key))??fallback;}catch{return fallback;}},set(key,value){try{localStorage.setItem('larpedin:'+key,JSON.stringify(value));return true;}catch{return false;}}};
installPhotoFallback();
const identity=createIdentityStore();
let me=identity.resolve(characters); // who "you" are: a built-in or custom mogul, kept in this browser only
applyIdentity(me);
const av=(name)=>`<span class="avatar avatar-${name}" aria-hidden="true"></span>`;
const saved = new Set(storage.get('saved',[]));
const liked = new Set(storage.get('liked',[]));
const legacyAvatars={gavin:'elong-husk',priya:'mark-zuckerbot',martin:'satire-nadella',oliver:'jensen-hype',nadia:'sundar-pitchai',you:'scam-altman'};
const publicCharacter=id=>characters[id];
const modernize=entry=>{const c=publicCharacter(entry.characterId||legacyAvatars[entry.avatar]);return c?{...entry,characterId:c.characterId,name:c.name,avatar:c.characterId==='scam-altman'?'you':c.avatar,role:c.role}:entry;};
const comments=Object.fromEntries(Object.entries(storage.get('comments',{})).map(([id,list])=>[id,list.map(modernize)]));
let ownPosts = storage.get('posts',[]).slice(0,20);
let activeFilter='all', view='home', toastTimer, lastFocus, feedNextCursor, feedLoading=false, feedHasMore=false, feedLoadFailed=false;
const simulations=new Map();
const notifications=storage.get('notifications',[]).slice(0,12).map(modernize);
const replyIds=['elong-husk','mark-zuckerbot','satire-nadella','jensen-hype','sundar-pitchai','elong-husk'];
const characterReplies=()=>replyIds.map(id=>id===me.id?'scam-altman':id).map(characterId=>{const c=publicCharacter(characterId);return {...c,text:c.reply};});
const theme=storage.get('theme','system');if(theme!=='system')document.documentElement.dataset.theme=theme;
function toast(text){clearTimeout(toastTimer);$('#toast').textContent=text;$('#toast').hidden=false;toastTimer=setTimeout(()=>$('#toast').hidden=true,4200);}
function modal(title,html){lastFocus=document.activeElement;$('#dialog-title').textContent=title;$('#dialog-content').innerHTML=html;if(!$('#dialog').open)$('#dialog').showModal();}
function closeModal(){$('#dialog').close();lastFocus?.focus();}
$('#dialog').addEventListener('click',event=>{if(event.target===$('#dialog'))closeModal();});
$('#dialog').addEventListener('close',()=>lastFocus?.focus());
function persistPosts(){storage.set('posts',ownPosts);}
function applyFeed(){
 const query=$('#search').value.trim().toLowerCase();let count=0;
 $$('.post').forEach(post=>{const allowed=(activeFilter==='all'||activeFilter==='saved'&&saved.has(post.id)||post.dataset.category===activeFilter)&&post.textContent.toLowerCase().includes(query)&&!post.dataset.dismissed;post.hidden=!allowed;if(allowed)count++;});
 $('#empty-state').hidden=count>0||view!=='home'||feedHasMore;$('.feed-end').hidden=count===0||view!=='home'||feedHasMore;
 $('#feed-loader').hidden=view!=='home'||!feedHasMore;
}
function home(){view='home';$('#alternate-view').hidden=true;$('#posts').hidden=false;$('.welcome').hidden=false;$('.composer').hidden=false;$('.feed-controls').hidden=false;setNav('home');applyFeed();}
function setNav(action){$$('.nav-item').forEach(b=>{b.classList.toggle('active',b.dataset.action===action);if(b.dataset.action===action)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');});}
function selectView(title,description,content,action){view=action;setNav(action);$('#posts').hidden=true;$('.welcome').hidden=true;$('.composer').hidden=true;$('.feed-controls').hidden=true;$('.feed-end').hidden=true;$('#empty-state').hidden=true;$('#alternate-view').hidden=false;$('#alternate-view').innerHTML=`<section class="card view-card"><h2>${title}</h2><p>${description}</p>${content}<button class="text-button" data-action="home">← Back to feed</button></section>`;window.scrollTo({top:0});}
function commentMarkup(c){const mine=(c.avatar||'you')==='you';return `<li class="new-comment">${av(c.avatar||'you')}<div class="comment-bubble"><strong${mine?' data-me-name':''}>${escape(mine?me.name:c.name)}</strong><small${mine?' data-me-role':''}>${escape(mine?me.role:c.role)}</small><p>${escape(c.text)}</p></div></li>`;}
function addComment(post,c,persist=true){$('.comment-list',post).insertAdjacentHTML('beforeend',commentMarkup(c));if(persist){(comments[post.id]??=[]).push(c);comments[post.id]=comments[post.id].slice(-30);storage.set('comments',comments);}const n=(Number(post.dataset.extraComments)||0)+1;post.dataset.extraComments=n;const base=ownPosts.some(p=>p.id===post.id)?0:Number($('.comment-count',post).dataset.base||0);$('.comment-count',post).textContent=`${base+n} comments`;}
function restorePost(post){
 const id=post.id;const like=$('[data-action="like"]',post);like.setAttribute('aria-pressed',String(liked.has(id)));if(liked.has(id))like.lastChild.textContent='Liked';
 $('[data-action="save"]',post).setAttribute('aria-pressed',String(saved.has(id)));
 $('.comment-count',post).dataset.base=parseInt($('.comment-count',post).textContent)||0;
 (comments[id]||[]).forEach(c=>addComment(post,c,false));
 updateLikes(post);
}
function updateLikes(post){const own=ownPosts.find(p=>p.id===post.id);const total=(own?.reactions||Number(post.dataset.likes)||0)+(liked.has(post.id)?1:0);$('[data-like-count]',post).textContent=total.toLocaleString('en-GB');}
function startSimulation(post,record){
 if(simulations.has(post.id)||record.tick>=18)return;
 let tick=record.tick||0;
 const status=document.createElement('div');status.className='viral-status';status.textContent='Your 2.3M fictional followers are discovering this post…';$('.post-author',post).before(status);
 const step=()=>{
  if(document.hidden)return;
  tick++;record.tick=tick;record.reactions=(record.reactions||0)+[83,247,519,1108,684,1423,376,2067,823,1134,619,1762,1274,933,1701,648,1208,951][tick-1];
  updateLikes(post);status.textContent=`${record.reactions.toLocaleString('en-GB')} reactions. Your personal brand is getting out of hand. · Simulated`;
  if([2,4,7,10,13,16].includes(tick)){
   const n=[2,4,7,10,13,16].indexOf(tick);const c=characterReplies()[n];
   if(!post.dataset.commentsToggled && n===0) $('.comments',post).hidden=false;addComment(post,c);
   notifications.unshift({name:c.name,avatar:c.avatar,text:'commented on your post.',postId:post.id});notifications.splice(12);storage.set('notifications',notifications);$('.notification-dot').textContent=String(notifications.length);toast(`${c.name} commented on your post`);
  }
  persistPosts();if(tick>=18){clearInterval(simulations.get(post.id));simulations.delete(post.id);status.textContent=`${record.reactions.toLocaleString('en-GB')} reactions. Congratulations on your completely fictional influence.`;}
 };
 const timer=setInterval(step,2200);simulations.set(post.id,timer);
}
async function renderOwn(record,simulate=true){
 const response=await fetch('/api/posts/preview',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text:record.text,id:record.id})});
 if(!response.ok)throw new Error('Your post couldn’t be published. Please try again.');const result=await response.json();record.id=result.id;
 $('#posts').insertAdjacentHTML('afterbegin',result.html);const post=document.getElementById(result.id);applyText(me,post);restorePost(post);observeAds(post);if(simulate)startSimulation(post,record);return post;
}
function compose(){modal('Create a post',`<form id="compose-form"><div class="compose-identity">${av('you')}<div><strong>${escape(me.name)}</strong><small>CEO of ${escape(me.company)} · Post to 2.3M fictional followers</small></div></div><label for="post-text" class="form-label">What’s your hot take?</label><textarea id="post-text" name="text" maxlength="3000" required placeholder="I’m humbled to announce that I have an opinion…"></textarea><p class="muted">Your post stays in this browser. Reactions and character replies are simulated.</p><p id="compose-error" class="form-error" role="alert" hidden></p><div class="compose-footer"><small><span id="char-count">0</span> / 3,000 characters</small><button class="button primary" type="submit">Post</button></div></form>`);$('#post-text').focus();$('#post-text').addEventListener('input',()=>$('#char-count').textContent=$('#post-text').value.length);}
const adController=createAdController({provider}); // No third-party requests with the default configuration.
let adObserver;
function observeAds(root=document){
 if(!('IntersectionObserver' in window))return;
 adObserver??=new IntersectionObserver(entries=>entries.forEach(async entry=>{
  if(!entry.isIntersecting)return;const slot=entry.target;if(provider && !hasAdConsent())return;adObserver.unobserve(slot);
  const mount=document.createElement('div');
  const result=await adController.load({id:slot.dataset.placement,visible:true,consent:hasAdConsent(),mount});
  if(result==='filled' && mount.childNodes.length)$('[data-ad-mount]',slot).replaceChildren(...mount.childNodes);
 }),{rootMargin:'200px'});
 $$('[data-ad-slot]',root).forEach(el=>adObserver.observe(el));
}
window.addEventListener('larpedin:ad-consent-changed',()=>{adObserver?.disconnect();observeAds();});
async function context(){const r=await fetch('/api/context');if(!r.ok)throw new Error('Could not load this section. Please try again.');return r.json();}
let feedObserver;
let sourceName='';
function updateLatestNews(headlines){
 if(!Array.isArray(headlines)||!headlines.length)return;
 const list=$('#latest-news');
 const items=headlines.slice(0,5).map(headline=>{
  const item=document.createElement('li'),link=document.createElement(headline.postId?'button':headline.url?'a':'div'),title=document.createElement('strong'),meta=document.createElement('small'),source=document.createElement('span');
  if(headline.postId){link.dataset.action='news-post';link.dataset.postId=headline.postId;}else if(headline.url){link.href=headline.url;link.target='_blank';link.rel='noopener noreferrer';}title.textContent=headline.title;meta.textContent=headline.time||'Recently';
  if(headline.postId?headline.author:headline.url){source.textContent=` · ${headline.author||sourceName}`;meta.append(source);}link.append(title,meta);item.append(link);return item;
 });
 list.replaceChildren(...items);$('.news-subtitle').textContent=sourceName?`Latest from ${sourceName} · Refreshed hourly`:'Latest technology news · Refreshed hourly';
}
function setFeedLoader(mode){
 const loader=$('#feed-loader'),spinner=$('.feed-spinner',loader),label=$('[data-feed-loader-text]',loader),retry=$('[data-action="load-more"]',loader);
 feedLoadFailed=mode==='error';loader.hidden=mode==='done'||view!=='home';spinner.hidden=mode==='error';retry.hidden=mode!=='error';
 label.textContent=mode==='error'?'The next round of thought leadership missed its quarterly target.':mode==='loading'?'Loading more questionable insight…':'More stories are ready below.';
}
function observeFeedLoader(){
 if(!('IntersectionObserver' in window)){const retry=$('#feed-loader [data-action="load-more"]');retry.hidden=false;retry.textContent='Load more';return;}
 feedObserver??=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting&&!feedLoadFailed)loadNextNewsPage();}),{rootMargin:'700px 0px'});
 feedObserver.observe($('#feed-loader'));
}
async function fetchNewsPage({replace=false}={}){
 if(feedLoading||(!replace&&!feedNextCursor))return;
 feedLoading=true;setFeedLoader('loading');
 try{
  const response=await fetch('/api/feed'+(replace?'':`?cursor=${encodeURIComponent(feedNextCursor)}`));
  if(!response.ok)throw new Error('Live feed unavailable');
  const feed=await response.json();
  if(!feed.html)throw new Error('Live feed was empty');
  sourceName=feed.sourceName||'';
  updateLatestNews(feed.headlines);
  const existing=new Set($$('.post').map(post=>post.id));
  if(replace)$('#posts').innerHTML=feed.html;
  else {const template=document.createElement('template');template.innerHTML=feed.html;const nodes=[...template.content.children].filter(node=>!existing.has(node.id));$('#posts').append(...nodes);}
  feedNextCursor=feed.nextCursor;feedHasMore=Boolean(feed.hasMore&&feed.nextCursor);
  const fresh=$$('.post').filter(post=>replace||!existing.has(post.id));fresh.forEach(restorePost);observeAds();
  $('#feed-status').textContent=feed.status;
  setFeedLoader(feedHasMore?'ready':'done');if(feedHasMore)setTimeout(observeFeedLoader,0);applyFeed();
  return true;
 }catch{
  if(replace){feedHasMore=false;setFeedLoader('done');$('#feed-status').textContent='Live news is taking a coffee break. Showing the house edition.';$('.news-subtitle').textContent='House edition while live news reloads.';}
  else setFeedLoader('error');
  return false;
 }finally{feedLoading=false;}
}
const loadNewsFeed=()=>{ $('#feed-status').textContent='Loading live tech news…';return fetchNewsPage({replace:true});};
const loadNextNewsPage=()=>fetchNewsPage();

const buzzleState=()=>{const day=buzzle.dayNumber();const saved=storage.get('buzzle',null);return {day,answer:buzzle.wordForDay(day),guesses:saved?.day===day?saved.guesses:[],current:''};};
let game;
function renderBuzzle(message=''){
 const {guesses,answer,current,day}=game,state=buzzle.status(guesses,answer),keys=buzzle.keyStates(guesses,answer);
 const rows=Array.from({length:buzzle.MAX_GUESSES},(_,r)=>{const g=guesses[r];const score=g&&buzzle.scoreGuess(g,answer);const letters=g||(r===guesses.length&&state==='playing'?current:'');
  return `<div class="buzzle-row">${Array.from({length:buzzle.WORD_LENGTH},(_,c)=>`<span class="buzzle-tile ${score?score[c]:letters[c]?'filled':''}">${letters[c]||''}</span>`).join('')}</div>`;}).join('');
 const kb=['QWERTYUIOP','ASDFGHJKL','ZXCVBNM'].map((row,n)=>`<div class="buzzle-keys">${n===2?'<button data-action="buzzle-key" data-key="Enter" class="wide">Enter</button>':''}${[...row].map(k=>`<button data-action="buzzle-key" data-key="${k}" class="${keys[k]||''}">${k}</button>`).join('')}${n===2?'<button data-action="buzzle-key" data-key="Backspace" class="wide" aria-label="Delete">⌫</button>':''}</div>`).join('');
 const end=state==='playing'?'':`<p class="buzzle-end">${state==='won'?'Synergy achieved. Promotion pending.':`Today’s word was <b>${answer}</b>. Reorg incoming.`}</p><button class="button primary" data-action="buzzle-share">Share result</button>`;
 $('#dialog-content').innerHTML=`<p>Guess today’s corporate word in ${buzzle.MAX_GUESSES} tries. Everyone gets the same word, and a new one lands at midnight UTC.</p><div class="buzzle-board" role="group" aria-label="Guesses">${rows}</div><p class="muted buzzle-message" role="status" aria-live="polite">${message}</p>${end}<div class="buzzle-kb">${kb}</div>`;
}
function buzzleInput(key){
 if(!game||!$('#dialog').open||!$('.buzzle-board')||buzzle.status(game.guesses,game.answer)!=='playing')return;
 if(key==='Enter'){if(game.current.length<buzzle.WORD_LENGTH)return renderBuzzle('Not enough letters. Like most roadmaps.');
  game.guesses.push(game.current);game.current='';storage.set('buzzle',{day:game.day,guesses:game.guesses});return renderBuzzle();}
 if(key==='Backspace'){game.current=game.current.slice(0,-1);return renderBuzzle();}
 if(/^[A-Za-z]$/.test(key)&&game.current.length<buzzle.WORD_LENGTH){game.current+=key.toUpperCase();renderBuzzle();}
}
const messageFriend=()=>publicCharacter(me.id==='mark-zuckerbot'?'elong-husk':'mark-zuckerbot');
const fallbackMessage='Quick question. Is this meeting actually an email?',fallbackReply='Let’s circle back once the algorithm has decided whether we are friends.';
function renderGreeting(){$('#welcome-title').textContent=greetingFor(new Date(),firstName(me.name));}
// Onboarding is a separate module so returning users never download it.
async function openOnboarding(mode){
 const {startOnboarding}=await import('./onboarding.js');
 startOnboarding({store:identity,characters,me,mode,onChange:(next,{announce})=>{me=next;applyIdentity(me);renderGreeting();if(announce)toast(`You’re now ${me.name}. Your followers haven’t noticed.`);}});
}
const actions={
 home(){activeFilter='all';$('#search').value='';$$('[data-filter]').forEach(b=>{b.classList.toggle('selected',b.dataset.filter==='all');b.setAttribute('aria-pressed',String(b.dataset.filter==='all'));});home();window.scrollTo({top:0});},
 compose,
 mogul(){if($('#dialog').open)closeModal();openOnboarding('change');},
 intro(){if($('#dialog').open)closeModal();openOnboarding('first-run');},
 'load-more':loadNextNewsPage,
 'close-dialog':closeModal,
 like(button,post){liked.has(post.id)?liked.delete(post.id):liked.add(post.id);storage.set('liked',[...liked]);button.setAttribute('aria-pressed',String(liked.has(post.id)));button.lastChild.textContent=liked.has(post.id)?'Liked':'Like';updateLikes(post);},
 comment(button,post){post.dataset.commentsToggled='true';$('.comments',post).hidden=!$('.comments',post).hidden;if(!$('.comments',post).hidden)$('input',post).focus();},
 follow(button){const followed=button.getAttribute('aria-pressed')==='true';button.setAttribute('aria-pressed',String(!followed));button.textContent=followed?'+ Follow':'✓ Following';toast(followed?'Your echo chamber just got a little quieter.':'Another thought leader added to your echo chamber.');},
 save(button,post){saved.has(post.id)?saved.delete(post.id):saved.add(post.id);storage.set('saved',[...saved]);button.setAttribute('aria-pressed',String(saved.has(post.id)));toast(saved.has(post.id)?'Saved for future inspiration.':'Post removed from saved items.');if(activeFilter==='saved')applyFeed();},
 saved(){if($('#dialog').open)closeModal();home();activeFilter='saved';applyFeed();toast('Showing your saved posts.');},
 hide(button,post){post.dataset.dismissed='true';applyFeed();toast('Post hidden until you refresh. Less thought leadership. More peace.');},
 repost(button,post){const yes=button.getAttribute('aria-pressed')==='true';button.setAttribute('aria-pressed',String(!yes));button.lastChild.textContent=yes?'Repost':'Reposted';toast(yes?'Repost removed.':'Reposted to your fictional network.');},
 async share(button,post){const url=location.origin+'/'+(post.id.startsWith('user-')?'':'#'+post.id);try{await navigator.clipboard.writeText(url);toast(post.id.startsWith('user-')?'LarpedIn link copied. Your local post is visible only to you.':'Link copied. Share the thought leadership.');}catch{modal('Share LarpedIn',`<p>Copy this link:</p><input aria-label="Share link" value="${escape(url)}" readonly>`);}},
 profile(){modal(me.name,`<div class="compose-identity">${av('you')}<div><h2>${escape(me.name)}</h2><p>CEO of ${escape(me.company)}. ${escape(me.tagline)}</p></div></div><p><strong>2,347,891</strong> fictional followers. <strong>${ownPosts.length}</strong> magnificent posts.</p><p class="muted">This is your parody account. Posts, comments and saved items are stored only in this browser.</p><div class="account-links"><button class="button outline" data-action="saved">Saved posts</button><button class="button outline" data-action="privacy">Privacy & ad choices</button><button class="button outline" data-action="about">About</button></div><h3>Your mogul</h3><div class="account-links"><button class="button outline" data-action="mogul">Change my mogul</button><button class="button outline" data-action="intro">Replay the intro</button></div><h3>Appearance</h3><div class="theme-options">${['system','light','dark'].map(t=>`<button class="button outline" data-action="theme" data-theme="${t}">${t[0].toUpperCase()+t.slice(1)}</button>`).join('')}</div><button class="button primary" data-action="compose">Create a post</button>`);},
 theme(button){const t=button.dataset.theme;storage.set('theme',t);if(t==='system')delete document.documentElement.dataset.theme;else document.documentElement.dataset.theme=t;toast(`Appearance: ${t}`);},
 async network(){const {people}=await context();selectView('Grow your echo chamber','Connect with the most confidently incorrect minds in tech.',people.map(p=>`<div class="network-person">${av(p.avatar)}<div><strong>${escape(p.name)}</strong><p>${escape(p.role)}</p><button class="button outline" data-action="follow" aria-pressed="false">+ Follow</button></div></div>`).join(''),'network');},
 jobs(){selectView('Jobs you’re overqualified to pretend at','Fictional opportunities. Realistic job descriptions.',[['Chief Alignment Whisperer','ClosedAI','San Francisco · Must agree with the model'],['Senior Vibe Engineer','Teslol','Remote · Office attendance required'],['Head of Personal Branding','MehTa','Hybrid · Must be comfortable being algorithmically authentic']].map(([title,company,details])=>`<div class="job"><span aria-hidden="true">${company.slice(0,1)}</span><div><h3>${title}</h3><p>${company}<br>${details}</p><button class="button outline" data-action="job">Easy Apply</button></div></div>`).join(''),'jobs');},
 job(){modal('Your application is already inspirational',`<p>This job is fictional. So is the requirement for 12 years of experience in generative AI.</p><p>No CV, personal information or actual application has been sent.</p><button class="button primary" data-action="close-dialog">Back to networking</button>`);},
 notifications(){const defaults=[['elong-husk','endorsed you for “Confidently explaining things”.'],['mark-zuckerbot','viewed your profile. The algorithm made him do it.'],['satire-nadella','invited you to scale your personal brand.']].map(([id,text])=>({...publicCharacter(id),text}));const items=notifications.length?notifications:defaults;modal('Notifications',`<p class="muted">Your fictional network is paying attention.</p>${items.map(n=>`<div class="notification-row">${av(n.avatar)}<div><p><strong>${escape(n.name)}</strong> ${escape(n.text)}</p><small>Simulated activity</small></div></div>`).join('')}`);$('.notification-dot').textContent='0';},
 messages(){const friend=messageFriend();modal('Messaging',`<div class="compose-identity">${av(friend.avatar)}<div><strong>${escape(friend.name)}</strong><small>Fictional conversation</small></div></div><div class="chat-thread"><p><strong>${escape(firstName(friend.name))}:</strong> ${escape((friend.message??fallbackMessage).replaceAll('{user}',firstName(me.name)))}</p></div><form id="message-form" class="comment-form"><label class="sr-only" for="message-input">Your message</label><input id="message-input" name="message" maxlength="500" placeholder="Write a message…" required><button class="button primary">Send</button></form><p class="muted">This conversation is simulated. Nothing is sent to anyone.</p>`);},
 'news-post'(button){const post=document.getElementById(button.dataset.postId);if(!post)return;post.scrollIntoView({block:'center',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});post.focus({preventScroll:true});},
 async news(button){const {news}=await context();const n=news[Number(button.dataset.news)||0];modal(n[0],`<p>${escape(n[3])}</p><p class="muted">LarpedIn News. Entirely fictional, alarmingly plausible.</p>`);},
 buzzle(){game=buzzleState();modal('Daily Buzzle','');renderBuzzle();},
 'buzzle-key'(button){buzzleInput(button.dataset.key);},
 async 'buzzle-share'(){const text=buzzle.shareText(game.guesses,game.answer,game.day);try{await navigator.clipboard.writeText(text);toast('Result copied. Go humblebrag.');}catch{toast('Could not copy. Screenshot it instead.');}},
 bingo(){modal('Daily Buzzword Bingo',`<p>Tick off the words you’ve already seen in your feed.</p><div class="bingo-grid">${['Synergy','Disruption','AI-powered','Humbled','Circle back','Thought leader','10x','Building in public','Game-changer'].map(t=>`<button data-action="bingo-cell" aria-pressed="false">${t}</button>`).join('')}</div><p class="muted" id="bingo-status">Three in a row. Zero business value.</p>`);},
 'bingo-cell'(button){button.setAttribute('aria-pressed',String(button.getAttribute('aria-pressed')!=='true'));const cells=$$('.bingo-grid button').map(b=>b.getAttribute('aria-pressed')==='true');const win=[[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]].some(row=>row.every(n=>cells[n]));$('#bingo-status').textContent=win?'Bingo! You are now a certified thought leader.':'Three in a row. Zero business value.';},
 about(){modal('Genuine news. Satirical takes.',`<p>LarpedIn is an independent, light-hearted parody of professional networking and tech thought leadership.</p><p>Executive personas, commentary and engagement figures are fictional. ${sourceName?`Linked ${sourceName} headlines and summaries come from its public RSS feed; follow “Read full story here” for the original reporting. We are not affiliated with LinkedIn, ${sourceName} or any company being parodied.`:'Headlines and summaries are based on real, publicly available tech news. We are not affiliated with LinkedIn or any company being parodied.'} This is satire, not fake news: the stories are real, the jokes are ours, and the characters parody public figures.</p><p><a href="/disclaimer">Full disclaimer</a> · <a href="/terms">Terms</a></p><p class="muted">Built to load quickly. Designed to make the news useful before your next stand-up.</p>`);},
 accessibility(){modal('Accessibility',`<p>Use Tab to navigate, Enter to activate buttons and Escape to close dialogs. Press / to search.</p><p>The feed works without JavaScript for reading. Motion follows your device preference. Light, dark and system themes are available under Me.</p><button class="button outline" data-action="profile">Open appearance settings</button>`);},
 privacy(){modal('Privacy & ad choices',`<p>This version uses local storage for your posts, reactions, comments, saved items, appearance and your tech mogul, including any custom mogul and its photo. They stay in this browser and are never uploaded.</p><p>All advertisements currently promote fictional house brands. No third-party ad scripts or tracking are loaded.</p><p class="muted">Live advertising needs a configured publisher account and a suitable consent platform. Your feed works regardless of whether an ad loads.</p><p><a href="/privacy">Read the full Privacy Policy</a></p><button class="button outline" data-action="clear-local">Clear my local activity</button>`);},
 'clear-local'(){modal('Clear your local activity?',`<p>This removes your posts, comments, reactions, saved posts and any custom moguls and photos from this browser, and resets your tech mogul. The intro will show again.</p><div class="privacy-actions"><button class="button outline" data-action="close-dialog">Keep my activity</button><button class="button primary" data-action="confirm-clear">Clear activity</button></div>`);},
 'confirm-clear'(){['posts','liked','saved','comments','notifications','mogul','custom-moguls','onboarded'].forEach(k=>{try{localStorage.removeItem('larpedin:'+k);}catch{}});location.reload();},
 sponsor(){modal('Your advert here',`<p>This space is available. Want your product or company in front of the LarpedIn audience? Get in touch and we will sort out the details.</p><p><a class="button primary" href="mailto:timr.codes@gmail.com?subject=LarpedIn%20advert%20enquiry">Email timr.codes@gmail.com</a></p><p class="muted">No payments are taken on this site. Every advert is clearly labelled.</p><button class="button outline" data-action="close-dialog">Close</button>`);},
 premium(){modal('Premium Delusion',`<p><strong>All the confidence. None of the qualifications.</strong></p><p>You already have 2.3 million fictional followers. What more could a personal brand need?</p><p class="muted">There is no subscription or checkout. The delusion is complimentary.</p><button class="button primary" data-action="compose">Put my influence to work</button>`);},
 groups(){modal('Your echo chambers',`<p><strong>AI Will Replace Everything Except My Job</strong><br>18,403 fictional experts. One shared opinion.</p><p><strong>Founders Who Definitely Sleep Four Hours</strong><br>Currently offline. Probably napping.</p><button class="button outline" data-action="network">Find thought leaders</button>`);},
 newsletter(){modal('The Weekly Humblebrag',`<p>A newsletter about the newsletter I’m building in public.</p><p>This week: why having a newsletter is the new having a startup.</p><button class="button primary" data-action="subscribe">Subscribe, theoretically</button>`);},
 subscribe(){toast('Subscribed in spirit. No email address required.');closeModal();},
 events(){modal('Upcoming fictional events',`<p><strong>Disrupting Disruption: A Fireside Chat</strong><br>Friday, 2pm · An unnecessarily expensive co-working space.</p><p><strong>More Compute, More Problems with Jensen Hype</strong><br>Saturday, 10am · Bring your own power station.</p><button class="button outline" data-action="rsvp">Attend, in spirit</button>`);},
 rsvp(){toast('You’re on the fictional guest list.');closeModal();}
};
document.addEventListener('click',async event=>{const filter=event.target.closest('[data-filter]');if(filter){activeFilter=filter.dataset.filter;$$('[data-filter]').forEach(b=>{b.classList.toggle('selected',b===filter);b.setAttribute('aria-pressed',String(b===filter));});home();return;}const button=event.target.closest('[data-action]');if(!button)return;try{await actions[button.dataset.action]?.(button,button.closest('.post'));}catch{toast('Something didn’t load. Please try again.');}});
document.addEventListener('submit',async event=>{
 const form=event.target;
 if(form.matches('.search')){event.preventDefault();home();applyFeed();return;}
 if(form.matches('.comment-form')&&form.id!=='message-form'){event.preventDefault();const input=$('input',form);if(!input.value.trim())return;addComment(form.closest('.post'),{avatar:'you',text:input.value.trim()});input.value='';return;}
 if(form.id==='message-form'){event.preventDefault();const text=$('#message-input').value.trim();if(!text)return;const friend=messageFriend();$('.chat-thread').insertAdjacentHTML('beforeend',`<p class="reply"><strong>You:</strong> ${escape(text)}</p><p><strong>${escape(firstName(friend.name))}:</strong> ${escape(friend.messageReply??fallbackReply)}</p>`);$('#message-input').value='';return;}
 if(form.id!=='compose-form')return;event.preventDefault();const text=$('#post-text').value.trim();if(!text)return;const button=$('button[type=submit]',form);button.disabled=true;button.textContent='Posting…';
 try{const record={text,id:'user-'+crypto.randomUUID(),reactions:0,tick:0};const post=await renderOwn(record,false);ownPosts.unshift(record);if(ownPosts.length>20){const removed=ownPosts.pop();document.getElementById(removed.id)?.remove();clearInterval(simulations.get(removed.id));simulations.delete(removed.id);}persistPosts();closeModal();activeFilter='all';$('#search').value='';$$('[data-filter]').forEach(b=>{b.classList.toggle('selected',b.dataset.filter==='all');b.setAttribute('aria-pressed',String(b.dataset.filter==='all'));});home();startSimulation(post,record);post.scrollIntoView({block:'start'});toast('Published. Your fictional empire is listening.');}
 catch(error){$('#compose-error').hidden=false;$('#compose-error').textContent=error.message;button.disabled=false;button.textContent='Post';}
});
$('#search').addEventListener('input',()=>{home();applyFeed();});
$('.sort select').addEventListener('change',event=>{const sorted=$$('.post').sort((a,b)=>event.target.value==='top'?Number(b.dataset.likes)-Number(a.dataset.likes):Number(a.dataset.index)-Number(b.dataset.index));if(event.target.value==='recent')sorted.sort((a,b)=>Number(b.id.startsWith('user-'))-Number(a.id.startsWith('user-')));$('#posts').append(...sorted);});
document.addEventListener('keydown',event=>{if($('.buzzle-board')&&!event.metaKey&&!event.ctrlKey&&!event.altKey&&(event.key.length===1||['Enter','Backspace'].includes(event.key))){if(event.key==='Enter'&&document.activeElement.tagName==='BUTTON')return;event.preventDefault();buzzleInput(event.key);return;}if(event.key==='/'&&!/INPUT|TEXTAREA/.test(document.activeElement.tagName)&&!$('#dialog').open){event.preventDefault();$('#search').focus();}});
const feedRoot=$('#feed');
renderGreeting();
if(feedRoot.dataset.edition){
 sourceName=feedRoot.dataset.sourceName||'';feedNextCursor=feedRoot.dataset.nextCursor||undefined;feedHasMore=Boolean(feedNextCursor);
 $$('.post').forEach(restorePost);observeAds();setFeedLoader(feedHasMore?'ready':'done');if(feedHasMore)setTimeout(observeFeedLoader,0);applyFeed();
}else await loadNewsFeed();
for(const record of [...ownPosts].reverse()){try{await renderOwn(record);}catch{toast('Saved posts could not be restored. Refresh to try again.');break;}}
applyFeed();
if(!identity.hasOnboarded())setTimeout(()=>openOnboarding('first-run').catch(()=>{}),350);
