// İNFAZCI servis çalışanı: program dosyalarını saklar (internetsiz açılış) ve internet varken
// her açılışta en yeni sürümü indirir. Sürüm değiştikçe SURUM'u artırın.
const SURUM = 'v11-2026-11-12';
const ONBELLEK = 'infazci-' + SURUM;
const TEMEL = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(ONBELLEK).then(c => c.addAll(TEMEL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('infazci-') && k !== ONBELLEK).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('message', e => { if (e.data === 'SURUM_SOR' && e.source) e.source.postMessage({ surum: SURUM }); });
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const ayniKaynak = new URL(req.url).origin === self.location.origin;
  if (ayniKaynak) {
    // Program dosyaları: önce internetten (en yeni), olmazsa saklanan kopya.
    e.respondWith(fetch(req, { cache: 'no-cache' }).then(r => {
      const kopya = r.clone(); caches.open(ONBELLEK).then(c => c.put(req, kopya)); return r;
    }).catch(() => caches.match(req).then(r => r || caches.match('./index.html'))));
  } else {
    // Dış araçlar (tasarım, PDF okuma vb.): saklanan varsa onu ver, arkada yenile.
    e.respondWith(caches.open(ONBELLEK).then(c => c.match(req).then(eski => {
      const ag = fetch(req).then(r => { if (r && (r.ok || r.type === 'opaque')) c.put(req, r.clone()); return r; }).catch(() => eski);
      return eski || ag;
    })));
  }
});
