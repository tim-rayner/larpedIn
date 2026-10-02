import { createAdController } from './ad-controller.js';
import { provider, hasAdConsent } from './ad-config.js';
const $ = (s, root=document) => root.querySelector(s);
const $$ = (s, root=document) => [...root.querySelectorAll(s)];
const escape = s => String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const storage = {get(key,fallback){try{return JSON.parse(localStorage.getItem('larpedin:'+key))??fallback;}catch{return fallback;}},set(key,value){try{localStorage.setItem('larpedin:'+key,JSON.stringify(value));return true;}catch{return false;}}};
const av=(name)=>`<span class="avatar avatar-${name}" aria-hidden="true"></span>`;
const saved = new Set(storage.get('saved',[]));
const liked = new Set(storage.get('liked',[]));
const comments = storage.get('comments',{});
let ownPosts = storage.get('posts',[]).slice(0,20);
let activeFilter='all', view='home', toastTimer, lastFocus;
const simulations=new Map();
const notifications=storage.get('notifications',[]).slice(0,12);
const characterReplies = [
 {name:'Walter White',avatar:'gavin',role:'Founder at Heisenberg Labs',text:'Finally. Someone who understands the chemistry of a scalable personal brand.'},
 {name:'Jesse Pinkman',avatar:'priya',role:'Co-founder | Yeah, science. And SaaS.',text:'Yo, this is what I’ve been saying! Except with fewer words and more exclamation marks.'},
 {name:'Gustavo Fring',avatar:'martin',role:'CEO at Los Pollos Hermanos',text:'An excellent perspective. At Los Pollos Hermanos, we believe consistency is the foundation of growth.'},
 {name:'Mike Ehrmantraut',avatar:'oliver',role:'Operations consultant',text:'Here’s what you’re gonna do. Close this app. Ship the feature. No half measures.'},
 {name:'Skyler White',avatar:'nadia',role:'CFO at A1A',text:'Interesting. And where, exactly, is the revenue coming from?'},
 {name:'Walter White',avatar:'gavin',role:'Founder at Heisenberg Labs',text:'I am not in the engagement business. I am in the empire business.'}
];
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
 $('#empty-state').hidden=count>0||view!=='home';$('.feed-end').hidden=count===0||view!=='home';
}
function home(){view='home';$('#alternate-view').hidden=true;$('#posts').hidden=false;$('.welcome').hidden=false;$('.composer').hidden=false;$('.feed-controls').hidden=false;setNav('home');applyFeed();}
function setNav(action){$$('.nav-item').forEach(b=>{b.classList.toggle('active',b.dataset.action===action);if(b.dataset.action===action)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');});}
function selectView(title,description,content,action){view=action;setNav(action);$('#posts').hidden=true;$('.welcome').hidden=true;$('.composer').hidden=true;$('.feed-controls').hidden=true;$('.feed-end').hidden=true;$('#empty-state').hidden=true;$('#alternate-view').hidden=false;$('#alternate-view').innerHTML=`<section class="card view-card"><h2>${title}</h2><p>${description}</p>${content}<button class="text-button" data-action="home">← Back to feed</button></section>`;window.scrollTo({top:0});}
function commentMarkup(c){return `<li class="new-comment">${av(c.avatar||'you')}<div class="comment-bubble"><strong>${escape(c.name||'Saul Goodman')}</strong><small>${escape(c.role||'Attorney | Personal brand enthusiast')}</small><p>${escape(c.text)}</p></div></li>`;}
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
   const n=[2,4,7,10,13,16].indexOf(tick);const c=characterReplies[n];
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
 $('#posts').insertAdjacentHTML('afterbegin',result.html);const post=document.getElementById(result.id);restorePost(post);observeAds(post);if(simulate)startSimulation(post,record);return post;
}
function compose(){modal('Create a post',`<form id="compose-form"><div class="compose-identity">${av('you')}<div><strong>Saul Goodman</strong><small>Post to 2.3M fictional followers</small></div></div><label for="post-text" class="form-label">What’s your hot take?</label><textarea id="post-text" name="text" maxlength="3000" required placeholder="I’m humbled to announce that I have an opinion…"></textarea><p class="muted">Your post stays in this browser. Reactions and character replies are simulated.</p><p id="compose-error" class="form-error" role="alert" hidden></p><div class="compose-footer"><small><span id="char-count">0</span> / 3,000 characters</small><button class="button primary" type="submit">Post</button></div></form>`);$('#post-text').focus();$('#post-text').addEventListener('input',()=>$('#char-count').textContent=$('#post-text').value.length);}
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
const actions={
 home(){activeFilter='all';$('#search').value='';$$('[data-filter]').forEach(b=>{b.classList.toggle('selected',b.dataset.filter==='all');b.setAttribute('aria-pressed',String(b.dataset.filter==='all'));});home();window.scrollTo({top:0});},
 compose,
 'close-dialog':closeModal,
 like(button,post){liked.has(post.id)?liked.delete(post.id):liked.add(post.id);storage.set('liked',[...liked]);button.setAttribute('aria-pressed',String(liked.has(post.id)));button.lastChild.textContent=liked.has(post.id)?'Liked':'Like';updateLikes(post);},
 comment(button,post){post.dataset.commentsToggled='true';$('.comments',post).hidden=!$('.comments',post).hidden;if(!$('.comments',post).hidden)$('input',post).focus();},
 follow(button){const followed=button.getAttribute('aria-pressed')==='true';button.setAttribute('aria-pressed',String(!followed));button.textContent=followed?'+ Follow':'✓ Following';toast(followed?'Your echo chamber just got a little quieter.':'Another thought leader added to your echo chamber.');},
 save(button,post){saved.has(post.id)?saved.delete(post.id):saved.add(post.id);storage.set('saved',[...saved]);button.setAttribute('aria-pressed',String(saved.has(post.id)));toast(saved.has(post.id)?'Saved for future inspiration.':'Post removed from saved items.');if(activeFilter==='saved')applyFeed();},
 saved(){if($('#dialog').open)closeModal();home();activeFilter='saved';applyFeed();toast('Showing your saved posts.');},
 hide(button,post){post.dataset.dismissed='true';applyFeed();toast('Post hidden until you refresh. Less thought leadership. More peace.');},
 repost(button,post){const yes=button.getAttribute('aria-pressed')==='true';button.setAttribute('aria-pressed',String(!yes));button.lastChild.textContent=yes?'Repost':'Reposted';toast(yes?'Repost removed.':'Reposted to your fictional network.');},
 async share(button,post){const url=location.origin+'/'+(post.id.startsWith('user-')?'':'#'+post.id);try{await navigator.clipboard.writeText(url);toast(post.id.startsWith('user-')?'LarpedIn link copied. Your local post is visible only to you.':'Link copied. Share the thought leadership.');}catch{modal('Share LarpedIn',`<p>Copy this link:</p><input aria-label="Share link" value="${escape(url)}" readonly>`);}},
 profile(){modal('Saul Goodman',`<div class="compose-identity">${av('you')}<div><h2>Saul Goodman</h2><p>Attorney. Thought leader. Personal brand enthusiast.</p></div></div><p><strong>2,347,891</strong> fictional followers. <strong>${ownPosts.length}</strong> magnificent posts.</p><p class="muted">This is your parody account. Posts, comments and saved items are stored only in this browser.</p><div class="account-links"><button class="button outline" data-action="saved">Saved posts</button><button class="button outline" data-action="privacy">Privacy & ad choices</button><button class="button outline" data-action="about">About</button></div><h3>Appearance</h3><div class="theme-options">${['system','light','dark'].map(t=>`<button class="button outline" data-action="theme" data-theme="${t}">${t[0].toUpperCase()+t.slice(1)}</button>`).join('')}</div><button class="button primary" data-action="compose">Create a post</button>`);},
 theme(button){const t=button.dataset.theme;storage.set('theme',t);if(t==='system')delete document.documentElement.dataset.theme;else document.documentElement.dataset.theme=t;toast(`Appearance: ${t}`);},
 async network(){const {people}=await context();selectView('Grow your echo chamber','Connect with the most confidently incorrect minds in Albuquerque.',people.map(p=>`<div class="network-person">${av(p.avatar)}<div><strong>${p.name}</strong><p>${p.role}</p><button class="button outline" data-action="follow" aria-pressed="false">+ Follow</button></div></div>`).join(''),'network');},
 jobs(){selectView('Jobs you’re overqualified to pretend at','Fictional opportunities. Realistic job descriptions.',[['Chief AI Whisperer','Heisenberg Labs','Remote · Exposure + equity'],['Senior Synergy Architect','Los Pollos Hermanos','Albuquerque · 12 years of AI experience required'],['Head of Personal Branding','Saul Goodman & Associates','Hybrid · Must be comfortable being humbled']].map(([title,company,details])=>`<div class="job"><span aria-hidden="true">${company.slice(0,1)}</span><div><h3>${title}</h3><p>${company}<br>${details}</p><button class="button outline" data-action="job">Easy Apply</button></div></div>`).join(''),'jobs');},
 job(){modal('Your application is already inspirational',`<p>This job is fictional. So is the requirement for 12 years of experience in generative AI.</p><p>No CV, personal information or actual application has been sent.</p><button class="button primary" data-action="close-dialog">Back to networking</button>`);},
 notifications(){const items=notifications.length?notifications:[{name:'Walter White',avatar:'gavin',text:'endorsed you for “Confidently explaining things”.'},{name:'Jesse Pinkman',avatar:'priya',text:'viewed your profile. Yeah, networking!'},{name:'Gustavo Fring',avatar:'martin',text:'invited you to scale your personal brand.'}];modal('Notifications',`<p class="muted">Your fictional network is paying attention.</p>${items.map(n=>`<div class="notification-row">${av(n.avatar)}<div><p><strong>${n.name}</strong> ${n.text}</p><small>Simulated activity</small></div></div>`).join('')}`);$('.notification-dot').textContent='0';},
 messages(){modal('Messaging',`<div class="compose-identity">${av('priya')}<div><strong>Jesse Pinkman</strong><small>Fictional conversation</small></div></div><div class="chat-thread"><p><strong>Jesse:</strong> Yo Saul. Quick question. Can we put “AI-powered” on the pitch deck if we used spellcheck?</p></div><form id="message-form" class="comment-form"><label class="sr-only" for="message-input">Your message</label><input id="message-input" name="message" maxlength="500" placeholder="Write a message…" required><button class="button primary">Send</button></form><p class="muted">This conversation is simulated. Nothing is sent to anyone.</p>`);},
 async news(button){const {news}=await context();const n=news[Number(button.dataset.news)||0];modal(n[0],`<p>${escape(n[3])}</p><p class="muted">LarpedIn News. Entirely fictional, alarmingly plausible.</p>`);},
 bingo(){modal('Daily Buzzword Bingo',`<p>Tick off the words you’ve already seen in your feed.</p><div class="bingo-grid">${['Synergy','Disruption','AI-powered','Humbled','Circle back','Thought leader','10x','Building in public','Game-changer'].map(t=>`<button data-action="bingo-cell" aria-pressed="false">${t}</button>`).join('')}</div><p class="muted" id="bingo-status">Three in a row. Zero business value.</p>`);},
 'bingo-cell'(button){button.setAttribute('aria-pressed',String(button.getAttribute('aria-pressed')!=='true'));const cells=$$('.bingo-grid button').map(b=>b.getAttribute('aria-pressed')==='true');const win=[[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]].some(row=>row.every(n=>cells[n]));$('#bingo-status').textContent=win?'Bingo! You are now a certified thought leader.':'Three in a row. Zero business value.';},
 about(){modal('Professional networking. Amateur opinions.',`<p>LarpedIn is an independent, light-hearted parody of professional networking and tech thought leadership.</p><p>The Breaking Bad characters are fictional fan-parody personas. Posts, engagement figures, news, jobs and conversations are made up. We are not affiliated with LinkedIn or the creators of Breaking Bad.</p><p class="muted">Built to load quickly. Designed to make you laugh before your next stand-up.</p>`);},
 accessibility(){modal('Accessibility',`<p>Use Tab to navigate, Enter to activate buttons and Escape to close dialogs. Press / to search.</p><p>The feed works without JavaScript for reading. Motion follows your device preference. Light, dark and system themes are available under Me.</p><button class="button outline" data-action="profile">Open appearance settings</button>`);},
 privacy(){modal('Privacy & ad choices',`<p>This version uses local storage for your posts, reactions, comments, saved items and appearance. They stay in this browser.</p><p>All advertisements currently promote fictional house brands. No third-party ad scripts or tracking are loaded.</p><p class="muted">Live advertising needs a configured publisher account and a suitable consent platform. Your feed works regardless of whether an ad loads.</p><button class="button outline" data-action="clear-local">Clear my local activity</button>`);},
 'clear-local'(){modal('Clear your local activity?',`<p>This removes your posts, comments, reactions and saved posts from this browser.</p><div class="privacy-actions"><button class="button outline" data-action="close-dialog">Keep my activity</button><button class="button primary" data-action="confirm-clear">Clear activity</button></div>`);},
 'confirm-clear'(){['posts','liked','saved','comments','notifications'].forEach(k=>{try{localStorage.removeItem('larpedin:'+k);}catch{}});location.reload();},
 sponsor(){modal('Your ad. Our questionable audience.',`<p>Every post has its own labelled advertisement. For now, the sponsors are fictional. The coffee round is also imaginary.</p><p>This space is ready for future publisher integration and direct sponsorships. No payments are being taken.</p><p class="muted">The house ad stays visible if an ad is blocked, slow or unavailable.</p><button class="button primary" data-action="close-dialog">Sounds disruptive</button>`);},
 premium(){modal('Premium Delusion',`<p><strong>All the confidence. None of the qualifications.</strong></p><p>You already have 2.3 million fictional followers. What more could a personal brand need?</p><p class="muted">There is no subscription or checkout. The delusion is complimentary.</p><button class="button primary" data-action="compose">Put my influence to work</button>`);},
 groups(){modal('Your echo chambers',`<p><strong>AI Will Replace Everything Except My Job</strong><br>18,403 fictional experts. One shared opinion.</p><p><strong>Founders Who Definitely Sleep Four Hours</strong><br>Currently offline. Probably napping.</p><button class="button outline" data-action="network">Find thought leaders</button>`);},
 newsletter(){modal('The Weekly Humblebrag',`<p>A newsletter about the newsletter I’m building in public.</p><p>This week: why having a newsletter is the new having a startup.</p><button class="button primary" data-action="subscribe">Subscribe, theoretically</button>`);},
 subscribe(){toast('Subscribed in spirit. No email address required.');closeModal();},
 events(){modal('Upcoming fictional events',`<p><strong>Disrupting Disruption: A Fireside Chat</strong><br>Friday, 2pm · An unnecessarily expensive co-working space.</p><p><strong>No Half Measures: Shipping With Mike</strong><br>Saturday, 10am · Meeting cancelled. Go ship something.</p><button class="button outline" data-action="rsvp">Attend, in spirit</button>`);},
 rsvp(){toast('You’re on the fictional guest list.');closeModal();}
};
document.addEventListener('click',async event=>{const filter=event.target.closest('[data-filter]');if(filter){activeFilter=filter.dataset.filter;$$('[data-filter]').forEach(b=>{b.classList.toggle('selected',b===filter);b.setAttribute('aria-pressed',String(b===filter));});home();return;}const button=event.target.closest('[data-action]');if(!button)return;try{await actions[button.dataset.action]?.(button,button.closest('.post'));}catch{toast('Something didn’t load. Please try again.');}});
document.addEventListener('submit',async event=>{
 const form=event.target;
 if(form.matches('.search')){event.preventDefault();home();applyFeed();return;}
 if(form.matches('.comment-form')&&form.id!=='message-form'){event.preventDefault();const input=$('input',form);if(!input.value.trim())return;addComment(form.closest('.post'),{name:'Saul Goodman',avatar:'you',text:input.value.trim()});input.value='';return;}
 if(form.id==='message-form'){event.preventDefault();const text=$('#message-input').value.trim();if(!text)return;$('.chat-thread').insertAdjacentHTML('beforeend',`<p class="reply"><strong>You:</strong> ${escape(text)}</p><p><strong>Jesse:</strong> That’s what I’m talking about. Let’s circle back, yo.</p>`);$('#message-input').value='';return;}
 if(form.id!=='compose-form')return;event.preventDefault();const text=$('#post-text').value.trim();if(!text)return;const button=$('button[type=submit]',form);button.disabled=true;button.textContent='Posting…';
 try{const record={text,id:'user-'+crypto.randomUUID(),reactions:0,tick:0};const post=await renderOwn(record,false);ownPosts.unshift(record);if(ownPosts.length>20){const removed=ownPosts.pop();document.getElementById(removed.id)?.remove();clearInterval(simulations.get(removed.id));simulations.delete(removed.id);}persistPosts();closeModal();activeFilter='all';$('#search').value='';$$('[data-filter]').forEach(b=>{b.classList.toggle('selected',b.dataset.filter==='all');b.setAttribute('aria-pressed',String(b.dataset.filter==='all'));});home();startSimulation(post,record);post.scrollIntoView({block:'start'});toast('Published. Your fictional empire is listening.');}
 catch(error){$('#compose-error').hidden=false;$('#compose-error').textContent=error.message;button.disabled=false;button.textContent='Post';}
});
$('#search').addEventListener('input',()=>{home();applyFeed();});
$('.sort select').addEventListener('change',event=>{const sorted=$$('.post').sort((a,b)=>event.target.value==='top'?Number(b.dataset.likes)-Number(a.dataset.likes):Number(a.dataset.index)-Number(b.dataset.index));if(event.target.value==='recent')sorted.sort((a,b)=>Number(b.id.startsWith('user-'))-Number(a.id.startsWith('user-')));$('#posts').append(...sorted);});
document.addEventListener('keydown',event=>{if(event.key==='/'&&!/INPUT|TEXTAREA/.test(document.activeElement.tagName)&&!$('#dialog').open){event.preventDefault();$('#search').focus();}});
$$('.post').forEach(restorePost);observeAds();
for(const record of [...ownPosts].reverse()){try{await renderOwn(record);}catch{toast('Saved posts could not be restored. Refresh to try again.');break;}}
applyFeed();
