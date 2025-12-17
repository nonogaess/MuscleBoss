// MuscleBoss — Service Worker (cache + updates propres)
// Version: 2025-12-17-FIXED-V2

const CACHE_NAME = "muscle-boss-v7-2025-12-17-no-html-cache";
const CORE_ASSETS = [
  "./manifest.json",
  "./service-worker.js"
];

// Install: cache minimal (PAS d'index.html pour éviter les problèmes de cache)
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS))
  );
  self.skipWaiting();
});

// Activate: clean old caches + claim clients
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => k.startsWith("muscle-boss-") && k !== CACHE_NAME)
          .map((k) => caches.delete(k))
      );
      await self.clients.claim();
    })()
  );
});

// Allow page to ask us to activate immediately
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

// Fetch strategy:
// - HTML: TOUJOURS network-first, JAMAIS de cache (pour éviter les dates bloquées)
// - Autres assets: cache si disponible
self.addEventListener("fetch", (event) => {
  const req = event.request;

  // Only handle GET
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // Same-origin only
  const sameOrigin = url.origin === self.location.origin;

  // HTML navigations - FORCE NETWORK ONLY
  const isNavigation =
    req.mode === "navigate" ||
    (req.headers.get("accept") || "").includes("text/html") ||
    url.pathname.endsWith(".html") ||
    url.pathname === "/" ||
    url.pathname === "./";

  if (sameOrigin && isNavigation) {
    event.respondWith(
      (async () => {
        try {
          // TOUJOURS chercher sur le réseau, JAMAIS de cache pour HTML
          const fresh = await fetch(req, { 
            cache: "no-store",
            headers: {
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              'Pragma': 'no-cache'
            }
          });
          return fresh;
        } catch (err) {
          // En cas d'erreur réseau, message offline
          return new Response("Application hors ligne - Vérifiez votre connexion", { 
            status: 503,
            headers: { 'Content-Type': 'text/plain; charset=utf-8' }
          });
        }
      })()
    );
    return;
  }

  // Other assets (images, icons, etc.) - cache OK
  if (sameOrigin) {
    event.respondWith(
      (async () => {
        const cached = await caches.match(req);
        if (cached) return cached;

        try {
          const fresh = await fetch(req);
          const cache = await caches.open(CACHE_NAME);
          cache.put(req, fresh.clone());
          return fresh;
        } catch (err) {
          return new Response("Offline", { status: 503 });
        }
      })()
    );
  }
});
