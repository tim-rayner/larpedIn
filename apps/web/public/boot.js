// Runs before first paint so a returning user never sees the default face flash before their own.
// Mirrors applyAvatar() in identity.js; kept tiny and dependency-free because it blocks rendering.
try{var p='larpedin:',r=document.documentElement,a=JSON.parse(localStorage.getItem(p+'mogul')||'null'),m=a&&a.id;
if(typeof m==='string'){if(m.indexOf('custom-')===0){var f=JSON.parse(localStorage.getItem(p+'custom-moguls')||'[]').filter(function(c){return c&&c.id===m})[0];
if(f&&/^data:image\/(webp|jpeg|png);base64,[A-Za-z0-9+\/]+={0,2}$/.test(f.photo)){r.dataset.mogul='custom';r.style.setProperty('--you-photo','url("'+f.photo+'")')}}
else if(/^[a-z-]+$/.test(m))r.dataset.mogul=m}}catch(e){}
