/* RouteLog service worker — keeps the app opening with no signal.
   App pages: network first, fall back to the saved copy.
   Libraries/fonts: saved copy first. Database calls are never cached here
   (the app keeps its own saved copy of each route). */
const CACHE = "routelog-v10";
const SHELL = ["./", "./index.html", "./manifest.json", "./icon-192.png", "./icon-512.png",
  "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.118.0/dist/umd/supabase.js",
  "https://cdn.jsdelivr.net/npm/sortablejs@1.15.2/Sortable.min.js"];
self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(SHELL.map(u => c.add(new Request(u, { mode: u.startsWith("http") ? "cors" : "same-origin" })).catch(() => {})))));
  self.skipWaiting();
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== "GET" || url.hostname.endsWith("supabase.co")) return;
  const isPage = req.mode === "navigate" || (url.origin === location.origin && /\.(html|json)$|\/$/.test(url.pathname));
  if (isPage) {
    e.respondWith(fetch(req.url, { cache: "no-cache", credentials: "same-origin" }).then(r => { const cp = r.clone(); caches.open(CACHE).then(c => c.put(req.mode === "navigate" ? "./index.html" : req, cp)); return r; })
      .catch(() => caches.match(req).then(m => m || caches.match("./index.html"))));
    return;
  }
  if (/cdn\.jsdelivr\.net|cdnjs\.cloudflare\.com|fonts\.(googleapis|gstatic)\.com/.test(url.hostname) || url.origin === location.origin) {
    e.respondWith(caches.match(req).then(m => m || fetch(req).then(r => { if (r.ok || r.type === "opaque") { const cp = r.clone(); caches.open(CACHE).then(c => c.put(req, cp)); } return r; })));
  }
});
