/* StudyFlow AI service worker — app-shell cache + offline fallback */
const CACHE = "studyflow-v1";
const PRECACHE = ["/dashboard", "/manifest.webmanifest", "/icon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE).catch(() => {})));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

const OFFLINE_HTML =
  "<!doctype html><meta charset='utf-8'><meta name='viewport' content='width=device-width,initial-scale=1'>" +
  "<title>Offline</title><body style=\"font-family:system-ui;display:grid;place-items:center;height:100vh;margin:0;background:#0f172a;color:#fff\">" +
  "<div style='text-align:center'><h1 style='margin:0 0 8px'>You're offline</h1><p style='opacity:.7'>Reconnect to keep studying.</p></div></body>";

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // never touch Supabase / cross-origin

  // Navigations: network-first → cache → offline shell
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
          return res;
        })
        .catch(async () => {
          return (
            (await caches.match(req)) ||
            (await caches.match("/dashboard")) ||
            new Response(OFFLINE_HTML, { headers: { "Content-Type": "text/html" } })
          );
        })
    );
    return;
  }

  // Static assets: cache-first
  if (
    url.pathname.startsWith("/_next/static") ||
    url.pathname.endsWith(".svg") ||
    url.pathname.endsWith(".png") ||
    url.pathname.endsWith(".webmanifest")
  ) {
    event.respondWith(
      caches.match(req).then(
        (cached) =>
          cached ||
          fetch(req).then((res) => {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
            return res;
          })
      )
    );
    return;
  }

  // Everything else same-origin: network, fall back to cache
  event.respondWith(fetch(req).catch(() => caches.match(req)));
});
