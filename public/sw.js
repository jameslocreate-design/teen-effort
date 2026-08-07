// One-release cleanup worker for visitors trapped on an older cached build.
function isTeenEffortAppCache(name) {
  return (
    name === "app-pages" ||
    name === "built-assets" ||
    (/(^|-)precache-v\d+-|(^|-)runtime-/.test(name) &&
      name.endsWith(self.registration.scope))
  );
}

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) =>
  event.waitUntil(
    (async () => {
      try {
        const cacheNames = await caches.keys();
        const appCacheNames = cacheNames.filter(isTeenEffortAppCache);
        await Promise.allSettled(appCacheNames.map((name) => caches.delete(name)));
        await self.clients.claim();
        const windowClients = await self.clients.matchAll({ type: "window" });
        await Promise.allSettled(
          windowClients.map((client) => client.navigate(client.url)),
        );
      } finally {
        await self.registration.unregister();
      }
    })(),
  ),
);