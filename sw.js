/* Chấm Công — service worker (V5.16)
   • Trang chính: ƯU TIÊN MẠNG (có mạng là luôn lấy bản mới nhất), mất mạng/mạng yếu >4 giây mới dùng bản đã lưu.
   • Kho dữ liệu (Cloudflare Worker, Supabase, mọi địa chỉ API khác): KHÔNG BAO GIỜ lưu — đi thẳng ra mạng để số liệu luôn là số thật.
   • Thư viện (cdnjs, jsdelivr) và phông chữ: lưu để mở được khi mất mạng. */
const VERSION = 'V5.16';
const CACHE = 'chamcong-' + VERSION;
const CORE = ['./', './index.html', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png'];
const STATIC_HOSTS = ['cdnjs.cloudflare.com', 'cdn.jsdelivr.net', 'fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', function(e){
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(function(c){
    return Promise.all(CORE.map(function(u){ return c.add(new Request(u, { cache:'reload' })).catch(function(){}); }));
  }));
});
self.addEventListener('activate', function(e){
  e.waitUntil((async function(){
    const keys = await caches.keys();
    await Promise.all(keys.filter(function(k){ return k.indexOf('chamcong-') === 0 && k !== CACHE; }).map(function(k){ return caches.delete(k); }));
    await self.clients.claim();
  })());
});
function withTimeout(p, ms){
  return new Promise(function(resolve, reject){
    const t = setTimeout(function(){ reject(new Error('timeout')); }, ms);
    p.then(function(v){ clearTimeout(t); resolve(v); }, function(err){ clearTimeout(t); reject(err); });
  });
}
self.addEventListener('fetch', function(e){
  const req = e.request;
  if(req.method !== 'GET') return;
  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;
  if(!sameOrigin && STATIC_HOSTS.indexOf(url.hostname) === -1) return;   // API/kho dữ liệu: để trình duyệt tự đi ra mạng
  if(sameOrigin && (req.mode === 'navigate' || url.pathname.slice(-1) === '/' || url.pathname.slice(-11) === '/index.html')){
    e.respondWith(
      withTimeout(fetch(req), 4000).then(function(res){
        if(res && res.ok){ const copy = res.clone(); caches.open(CACHE).then(function(c){ c.put('./index.html', copy); }); }
        return res;
      }).catch(function(){
        return caches.match('./index.html').then(function(r){ return r || caches.match('./'); });
      })
    );
    return;
  }
  e.respondWith(caches.match(req).then(function(hit){
    const net = (sameOrigin ? fetch(req) : fetch(req.url, { mode:'cors', credentials:'omit' })).then(function(res){
      if(res && res.ok){ const copy = res.clone(); caches.open(CACHE).then(function(c){ c.put(req, copy); }); }
      return res;
    }).catch(function(){ return hit; });
    return hit || net;
  }));
});
