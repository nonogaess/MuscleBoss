// MuscleBoss — Service Worker (cache + updates propres)
// Version: 2025-12-17-FIXED

const CACHE_NAME = "muscle-boss-v6-2025-12-17-fixed";
const CORE_ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./service-worker.js"
];

// Install: cache core + take control as soon as possible
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

// Allow page to ask us to activate immediately (kept for compatibility with your index.html)
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

// Fetch strategy:
// - Navigation (HTML): network-first (so GitHub updates propagate), fallback cache
// - Static assets: cache-first + background update
self.addEventListener("fetch", (event) => {
  const req = event.request;

  // Only handle GET
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // Same-origin only (avoid caching analytics/CDN)
  const sameOrigin = url.origin === self.location.origin;

  // HTML navigations
  const isNavigation =
    req.mode === "navigate" ||
    (req.headers.get("accept") || "").includes("text/html");

  if (sameOrigin && isNavigation) {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(req, { cache: "no-store" });
          const cache = await caches.open(CACHE_NAME);
          cache.put("./index.html", fresh.clone());
          return fresh;
        } catch (err) {
          const cached = await caches.match("./index.html");
          return cached || new Response("Offline", { status: 503 });
        }
      })()
    );
    return;
  }

  // Other same-origin assets (images, icons, etc.)
  if (sameOrigin) {
    event.respondWith(
      (async () => {
        const cached = await caches.match(req);
        if (cached) {
          // Update in background
          event.waitUntil(
            (async () => {
              try {
                const fresh = await fetch(req);
                const cache = await caches.open(CACHE_NAME);
                cache.put(req, fresh.clone());
              } catch (e) {}
            })()
          );
          return cached;
        }

        // No cache yet
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
