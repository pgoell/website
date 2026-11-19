// Offline copy of the trip pages, for the Trips phone app. Read-only: nothing
// here queues a write. It keeps only trip pages, their scripts and styles; the
// map comes from Google and is not kept. The home page, blog and games go to
// the network as usual.
const PAGES = "trip-pages";
const ASSETS = "trip-assets";
const STALL_MS = 5000;
const TRIPS = /^\/(?:(?:en|de)\/)?trips(?:\/|$)/;

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) =>
  event.waitUntil(
    // The map parts kept before the map moved to Google go.
    caches
      .delete("trip-map")
      .then(() => self.clients.claim()),
  ),
);

// A trip page sends its path on load and after every change to the trip.
self.addEventListener("message", (event) => {
  if (typeof event.data === "string" && TRIPS.test(event.data)) {
    event.waitUntil(save(event.data).catch(() => {}));
  }
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== location.origin) return;
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(asset(request));
  } else if (request.mode === "navigate" && TRIPS.test(url.pathname)) {
    event.respondWith(page(request));
  }
});

async function save(path) {
  const res = await fetch(path);
  // A signed-out or failed request is never kept as the page.
  if (!res.ok || res.redirected) return;
  const html = await res.clone().text();
  // Scripts and styles first, so a saved page never points at files that are missing.
  // A deploy renames them, and the old page keeps its old files until the new set is in.
  const files = new Set(html.match(/\/_next\/static\/[^"'\\]+\.(?:js|css)/g));
  await (await caches.open(ASSETS)).addAll([...files]);
  await (await caches.open(PAGES)).put(path, res);
}

// Network first. The saved copy is for when the network fails or stalls, or the server is down.
async function page(request) {
  const saved = await savedPage(request);
  const fresh = fetch(request).then(
    (res) => (res.status >= 500 && saved ? saved : res),
    () => saved ?? Response.error(),
  );
  if (!saved) return fresh;
  return Promise.race([
    fresh,
    new Promise((resolve) => setTimeout(resolve, STALL_MS, saved)),
  ]);
}

async function savedPage(request) {
  const cache = await caches.open(PAGES);
  const hit = await cache.match(request, { ignoreSearch: true });
  if (hit) return hit;
  // The app opens at /trips. Offline, go to the trip page saved last.
  const last = (await cache.keys()).at(-1);
  return last && Response.redirect(last.url);
}

// File names carry a hash of their content, so a saved copy is never stale.
async function asset(request) {
  return (await caches.match(request, { cacheName: ASSETS })) ?? fetch(request);
}
