const SW_VERSION='1.2.1';
const CACHE_NAME='anthony-english-coach-v1-2-1';
const ASSETS=['./','./index.html','./styles.css?v=1.2.1','./content.js?v=1.2.1','./app.js?v=1.2.1','./cloud-auth.js?v=1.2.1','./cloud-config.js?v=1.2.1','./manifest.webmanifest','./yomian-english-icon-192-v3.png','./yomian-english-icon-512-v3.png'];

self.addEventListener('install',e=>{
  e.waitUntil(caches.open(CACHE_NAME).then(c=>c.addAll(ASSETS)));
});

function versionScore(name){
  const m=name.match(/anthony-english-coach-v(\d+)-(\d+)-(\d+)$/);
  return m?(Number(m[1])*1000000+Number(m[2])*1000+Number(m[3])):-1;
}

self.addEventListener('activate',e=>{
  e.waitUntil((async()=>{
    const keys=(await caches.keys()).filter(k=>k.startsWith('anthony-english-coach-v'));
    const keep=new Set(keys.sort((a,b)=>versionScore(b)-versionScore(a)).slice(0,2));
    keep.add(CACHE_NAME);
    await Promise.all(keys.filter(k=>!keep.has(k)).map(k=>caches.delete(k)));
  })());
});

self.addEventListener('message',e=>{
  if(e.data?.type==='SKIP_WAITING')self.skipWaiting();
  if(e.data?.type==='GET_VERSION'&&e.ports?.[0])e.ports[0].postMessage({version:SW_VERSION});
});

self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  const u=new URL(e.request.url);
  if(u.origin!==self.location.origin)return;
  e.respondWith(
    fetch(e.request,{cache:'no-store'}).then(r=>{
      const copy=r.clone();
      caches.open(CACHE_NAME).then(c=>c.put(e.request,copy)).catch(()=>{});
      return r;
    }).catch(async()=>await caches.match(e.request)||((e.request.mode==='navigate')?await caches.match('./index.html'):Response.error()))
  );
});

self.addEventListener('push',e=>{
  let d={title:'YOMIAN ENGLISH',body:'오늘 영어 10분이 아직 남아 있어요. 3분만 시작해도 좋습니다.',url:'./'};
  try{if(e.data)d={...d,...e.data.json()}}catch(_){try{d.body=e.data.text()}catch(__){}}
  e.waitUntil(self.registration.showNotification(d.title,{body:d.body,icon:'./yomian-english-icon-192-v3.png',badge:'./yomian-english-icon-192-v3.png',tag:'anthony-en-study',data:{url:d.url||'./'}}));
});

self.addEventListener('notificationclick',e=>{
  e.notification.close();
  const u=new URL(e.notification.data?.url||'./',self.registration.scope).href;
  e.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(list=>{
    for(const c of list){
      if(c.url.startsWith(self.registration.scope)&&'focus'in c){c.navigate(u).catch(()=>{});return c.focus()}
    }
    return clients.openWindow?clients.openWindow(u):null;
  }));
});
