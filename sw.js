const CACHE_NAME = "tau-ars-nfc-v2";

const APP_FILES = [
  "./",
  "./index.html",
  "./manifest.json",
  "./images/tau-logo.png",
  "./images/ars-logo.png"
];

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function (cache) {
        return cache.addAll(APP_FILES);
      })
      .then(function () {
        return self.skipWaiting();
      })
  );
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys()
      .then(function (keys) {
        return Promise.all(
          keys
            .filter(function (key) {
              return key.startsWith("tau-ars-nfc-") && key !== CACHE_NAME;
            })
            .map(function (key) {
              return caches.delete(key);
            })
        );
      })
      .then(function () {
        return self.clients.claim();
      })
  );
});

self.addEventListener("message", function (event) {
  if (!event.data || event.data.type !== "CACHE_PAGE") return;

  const replyPort = event.ports && event.ports[0];

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function (cache) {
        return cache.addAll(APP_FILES);
      })
      .then(function () {
        if (replyPort) replyPort.postMessage({ ok: true });
      })
      .catch(function (error) {
        console.error("Could not cache all app files:", error);
        if (replyPort) replyPort.postMessage({ ok: false });
      })
  );
});

self.addEventListener("fetch", function (event) {
  const request = event.request;
  const url = new URL(request.url);

  if (request.method !== "GET" || url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(request).then(function (cachedResponse) {
      if (cachedResponse) return cachedResponse;

      return fetch(request).then(function (response) {
        if (response && response.ok) {
          const responseCopy = response.clone();
          caches.open(CACHE_NAME)
            .then(function (cache) {
              cache.put(request, responseCopy);
            })
            .catch(function (error) {
              console.warn("Could not update cache:", error);
            });
        }
        return response;
      }).catch(function () {
        if (request.mode === "navigate") {
          return caches.match("./index.html").then(function (page) {
            if (page) return page;

            return new Response(
              "TAU ARS Office card is not available offline yet. Open it online first.",
              {
                status: 503,
                headers: { "Content-Type": "text/plain; charset=utf-8" }
              }
            );
          });
        }

        return new Response("", { status: 503 });
      });
    })
  );
});
